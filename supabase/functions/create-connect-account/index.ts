import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const ALLOWED_ORIGINS = [
  "https://app.fitcore.tech",
  "https://client.fitcore.tech",
  "https://fitcore.tech",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    // ── 1. Verify the coach's JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
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
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── 2. Check if coach already has a Connect account ──
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: coach } = await supabaseAdmin
      .from("coaches")
      .select("stripe_connect_id, stripe_connect_onboarded")
      .eq("id", coachUser.id)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia",
    });

    let connectId = coach?.stripe_connect_id;

    // ── 3. If account exists, check if onboarding is complete ──
    if (connectId && !coach?.stripe_connect_onboarded) {
      const account = await stripe.accounts.retrieve(connectId);
      if (account.charges_enabled) {
        await supabaseAdmin
          .from("coaches")
          .update({ stripe_connect_onboarded: true })
          .eq("id", coachUser.id);

        return new Response(
          JSON.stringify({ onboarded: true }),
          {
            status: 200,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
      }
    }

    // ── 4. Create Express account if none exists ──
    if (!connectId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: coachUser.email,
        metadata: { coach_id: coachUser.id },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      connectId = account.id;

      await supabaseAdmin
        .from("coaches")
        .update({ stripe_connect_id: connectId })
        .eq("id", coachUser.id);
    }

    // ── 4. Create Account Link for onboarding ──
    const accountLink = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: "https://app.fitcore.tech/?page=settings&stripe=refresh",
      return_url: "https://app.fitcore.tech/?page=settings&stripe=success",
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("create-connect-account error:", message, err);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
