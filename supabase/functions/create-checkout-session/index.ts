import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // ── 2. Get coach row to check for existing Stripe customer ──
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: coach } = await supabaseAdmin
      .from("coaches")
      .select("stripe_customer_id, plan")
      .eq("id", coachUser.id)
      .single();

    // Already pro - no need to checkout
    if (coach?.plan === "pro") {
      return new Response(JSON.stringify({ error: "Already subscribed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Create Stripe Checkout Session ──
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia",
    });

    const setupFeePrice = Deno.env.get("STRIPE_SETUP_FEE_PRICE_ID")!;
    const subscriptionPrice = Deno.env.get("STRIPE_SUBSCRIPTION_PRICE_ID")!;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [
        // One-time $100 setup fee (added to first invoice)
        { price: setupFeePrice, quantity: 1 },
        // Recurring $49/month subscription
        { price: subscriptionPrice, quantity: 1 },
      ],
      metadata: { coach_id: coachUser.id },
      subscription_data: {
        metadata: { coach_id: coachUser.id },
      },
      success_url: "https://fitcore.tech/account?payment=success",
      cancel_url: "https://fitcore.tech/account?payment=cancelled",
    };

    // Reuse existing Stripe customer if they have one
    if (coach?.stripe_customer_id) {
      sessionParams.customer = coach.stripe_customer_id;
    } else {
      sessionParams.customer_email = coachUser.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
