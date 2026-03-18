import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

// No CORS needed — Stripe calls this server-to-server
// Deploy with: supabase functions deploy stripe-webhook --no-verify-jwt

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-12-18.acacia",
    });

    // ── 1. Verify Stripe webhook signature ──
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(`Webhook Error: ${err instanceof Error ? err.message : "unknown"}`, { status: 400 });
    }

    // ── 2. Supabase admin client ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // ── 3. Handle events ──
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const coachId = session.metadata?.coach_id;
        if (!coachId) {
          console.error("No coach_id in checkout session metadata");
          break;
        }

        const { error } = await supabase
          .from("coaches")
          .update({
            plan: "pro",
            subscription_status: "active",
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_ends_at: null,
          })
          .eq("id", coachId);

        if (error) console.error("Failed to update coach after checkout:", error.message);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const { error } = await supabase
          .from("coaches")
          .update({
            plan: "pro",
            subscription_status: "active",
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) console.error("Failed to update coach after invoice.paid:", error.message);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const { error } = await supabase
          .from("coaches")
          .update({
            subscription_status: "past_due",
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) console.error("Failed to update coach after payment failure:", error.message);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const coachId = subscription.metadata?.coach_id;

        const updates: Record<string, unknown> = {
          subscription_status: subscription.status === "active" ? "active" : subscription.status,
        };

        // If coach is cancelling at period end, store when access expires
        if (subscription.cancel_at_period_end) {
          updates.subscription_ends_at = new Date(subscription.current_period_end * 1000).toISOString();
        } else {
          updates.subscription_ends_at = null;
        }

        const query = coachId
          ? supabase.from("coaches").update(updates).eq("id", coachId)
          : supabase.from("coaches").update(updates).eq("stripe_subscription_id", subscription.id);

        const { error } = await query;
        if (error) console.error("Failed to update coach after subscription.updated:", error.message);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("coaches")
          .update({
            plan: "cancelled",
            subscription_status: "cancelled",
            subscription_ends_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) console.error("Failed to update coach after subscription.deleted:", error.message);
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
