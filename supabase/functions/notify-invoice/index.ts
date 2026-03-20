import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    // Verify caller is a coach
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
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

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { invoiceId } = await req.json();
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "Missing invoiceId" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Fetch invoice + client + coach details
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("id, amount, plan, period, status, client_id, coach_id")
      .eq("id", invoiceId)
      .single();

    if (!invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get client email
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("name, email, auth_user_id")
      .eq("id", invoice.client_id)
      .single();

    if (!client?.email) {
      return new Response(JSON.stringify({ error: "Client email not found" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get coach name
    const { data: coach } = await supabaseAdmin
      .from("coaches")
      .select("name")
      .eq("id", invoice.coach_id)
      .single();

    const coachName = coach?.name || "Your Coach";
    const clientName = client.name || "there";

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FitCore <noreply@mail.fitcore.tech>",
        to: [client.email],
        subject: `New Invoice from ${escapeHtml(coachName)} - $${invoice.amount}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #e0e0e0; background: #07090e;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0;">
                Fit<span style="color: #00e5c8;">Core</span>
              </h1>
            </div>

            <div style="background: rgba(14, 18, 27, 0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 28px 24px; margin-bottom: 24px;">
              <p style="font-size: 16px; color: #ffffff; margin: 0 0 16px;">
                Hi ${escapeHtml(clientName)},
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #a0a0a0; margin: 0 0 20px;">
                ${escapeHtml(coachName)} has sent you a new invoice. Here are the details:
              </p>

              <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 13px; color: #a0a0a0;">Plan</span>
                  <span style="font-size: 13px; color: #ffffff; font-weight: 600;">${escapeHtml(invoice.plan || "Coaching")}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 13px; color: #a0a0a0;">Period</span>
                  <span style="font-size: 13px; color: #ffffff; font-weight: 600;">${escapeHtml(invoice.period || "—")}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 13px; color: #a0a0a0;">Amount</span>
                  <span style="font-size: 18px; color: #00e5c8; font-weight: 700; font-family: 'JetBrains Mono', monospace;">$${invoice.amount}</span>
                </div>
              </div>

              <a href="https://client.fitcore.tech/?page=invoices" style="display: block; text-align: center; padding: 14px 24px; background: linear-gradient(135deg, #00e5c8, #00c4aa); color: #07090e; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 8px;">
                Pay Now
              </a>
            </div>

            <p style="font-size: 12px; color: #666; text-align: center; margin: 0;">
              This invoice was sent via <a href="https://fitcore.tech" style="color: #00e5c8; text-decoration: none;">FitCore</a>.
              If you have questions, contact your coach directly.
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("notify-invoice error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
