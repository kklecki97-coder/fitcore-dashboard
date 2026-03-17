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
    // ── 1. Verify the coach's JWT ──
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

    const { data: { user: coachUser }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !coachUser) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Parse request body ──
    const { invoiceId, amount, clientName, clientEmail, plan, period } = await req.json();

    if (!invoiceId || !amount) {
      return new Response(JSON.stringify({ error: "Missing invoiceId or amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Get coach's Connect account ──
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: coach } = await supabaseAdmin
      .from("coaches")
      .select("stripe_connect_id, stripe_connect_onboarded")
      .eq("id", coachUser.id)
      .single();

    if (!coach?.stripe_connect_id || !coach.stripe_connect_onboarded) {
      return new Response(
        JSON.stringify({ error: "Stripe Connect not set up. Please connect your Stripe account in Settings." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 4. Create Checkout Session on connected account ──
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia",
    });

    const amountCents = Math.round(amount * 100);
    const feeCents = Math.round(amountCents * 0.05); // 5% platform fee

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${plan || "Coaching"} Plan — ${period || "Monthly"}`,
                description: `Coaching invoice for ${clientName || "client"}`,
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
          coach_id: coachUser.id,
        },
        customer_email: clientEmail || undefined,
        success_url: `https://app.fitcore.tech/?payment=success&invoice=${invoiceId}`,
        cancel_url: `https://app.fitcore.tech/?payment=cancelled&invoice=${invoiceId}`,
      },
      {
        stripeAccount: coach.stripe_connect_id,
      }
    );

    // ── 5. Store payment URL and session ID on the invoice ──
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
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
