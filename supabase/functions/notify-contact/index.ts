import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://app.fitcore.tech",
  "https://client.fitcore.tech",
  "https://fitcore.tech",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
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
    const { name, email, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return new Response(JSON.stringify({ error: "All fields required" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Save to DB
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    await supabaseAdmin.from("contact_submissions").insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });

    // Send notification email to FitCore team
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FitCore Contact <noreply@mail.fitcore.tech>",
          to: ["contact@fitcore.tech"],
          subject: `New Contact Form: ${escapeHtml(name.trim())}`,
          reply_to: email.trim(),
          html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #e0e0e0; background: #07090e;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0;">
                  Fit<span style="color: #00e5c8;">Core</span>
                </h1>
                <p style="font-size: 13px; color: #666; margin: 8px 0 0;">New contact form submission</p>
              </div>

              <div style="background: rgba(14, 18, 27, 0.85); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Name</div>
                  <div style="font-size: 15px; color: #ffffff; font-weight: 600;">${escapeHtml(name.trim())}</div>
                </div>
                <div style="margin-bottom: 16px;">
                  <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Email</div>
                  <div style="font-size: 15px; color: #00e5c8;">
                    <a href="mailto:${escapeHtml(email.trim())}" style="color: #00e5c8; text-decoration: none;">${escapeHtml(email.trim())}</a>
                  </div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Message</div>
                  <div style="font-size: 14px; color: #e0e0e0; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(message.trim())}</div>
                </div>
              </div>

              <p style="font-size: 12px; color: #444; text-align: center;">
                Reply directly to this email to respond to ${escapeHtml(name.trim())}.
              </p>
            </div>
          `,
        }),
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("notify-contact error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
