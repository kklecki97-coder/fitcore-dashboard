import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ── 1. Verify the caller's JWT (client) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Parse request body (only invoiceId needed) ──
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Missing invoiceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ── 3. Fetch invoice from DB ──
    const { data: invoice, error: invError } = await supabaseAdmin
      .from("invoices")
      .select("id, coach_id, client_id, amount, plan, period, status")
      .eq("id", invoiceId)
      .single();

    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invoice.status === "paid") {
      return new Response(JSON.stringify({ error: "Invoice is already paid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Verify the caller owns this invoice ──
    const { data: clientRow } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!clientRow || clientRow.id !== invoice.client_id) {
      return new Response(JSON.stringify({ error: "Not authorized to pay this invoice" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5. Get coach's Stripe Connect account ──
    const { data: coach } = await supabaseAdmin
      .from("coaches")
      .select("stripe_connect_id, stripe_connect_onboarded")
      .eq("id", invoice.coach_id)
      .single();

    if (!coach?.stripe_connect_id || !coach.stripe_connect_onboarded) {
      return new Response(
        JSON.stringify({ error: "Coach has not set up payments yet. Please contact your coach." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 6. Create Checkout Session on connected account ──
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia",
    });

    const amountCents = Math.round(invoice.amount * 100);
    const feeCents = Math.round(amountCents * 0.05); // 5% platform fee

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${invoice.plan || "Coaching"} Plan - ${invoice.period || "Monthly"}`,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: feeCents,
        },
        metadata: {
          invoice_id: invoiceId,
          coach_id: invoice.coach_id,
        },
        customer_email: user.email || undefined,
        success_url: `https://client.fitcore.tech/?page=invoices&payment=success`,
        cancel_url: `https://client.fitcore.tech/?page=invoices&payment=cancelled`,
      },
      {
        stripeAccount: coach.stripe_connect_id,
      }
    );

    // ── 7. Store payment URL and session ID on the invoice ──
    await supabaseAdmin
      .from("invoices")
      .update({
        payment_url: session.url,
        stripe_checkout_session_id: session.id,
      })
      .eq("id", invoiceId);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("create-invoice-checkout error:", message, err);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
