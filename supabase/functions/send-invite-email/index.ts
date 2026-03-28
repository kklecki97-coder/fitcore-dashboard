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
  // Handle CORS preflight
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
    // 1. Verify coach JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Verify JWT
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parse request body
    const { code, clientName, clientEmail, plan, coachName } = await req.json();

    if (!code || !clientEmail) {
      return new Response(
        JSON.stringify({ error: "code and clientEmail are required" }),
        {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    // 3. Verify invite code exists and belongs to this coach
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invite_codes")
      .select("id, coach_id, used_by")
      .eq("code", code)
      .single();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invite code not found" }),
        {
          status: 404,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    if (invite.coach_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You don't own this invite code" }),
        {
          status: 403,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    if (invite.used_by) {
      return new Response(
        JSON.stringify({ error: "Invite code already used" }),
        {
          status: 409,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    // 4. Send email via Resend
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          error: "Email service not configured. RESEND_API_KEY is missing.",
        }),
        {
          status: 503,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    const inviteLink = `https://client.fitcore.tech/join/${code}`;
    const html = buildEmailHtml({
      clientName,
      coachName,
      plan,
      inviteLink,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FitCore <noreply@mail.fitcore.tech>",
        to: [clientEmail],
        subject: `${coachName || "Your coach"} invited you to FitCore`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      return new Response(
        JSON.stringify({ error: "Failed to send email", detail: errBody }),
        {
          status: 502,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    // 5. Success
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});

function buildEmailHtml({
  clientName,
  coachName,
  plan,
  inviteLink,
}: {
  clientName: string;
  coachName: string;
  plan: string;
  inviteLink: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07090e;font-family:'Outfit',Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <!-- Logo -->
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://fitcore.tech/fitcore-logo.png" width="48" height="48" alt="FitCore" style="border-radius:50%;" />
      <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:12px 0 4px;letter-spacing:-0.5px;">FitCore</h1>
    </div>

    <!-- Card -->
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px 24px;text-align:center;">
      <h2 style="color:#ffffff;font-size:20px;font-weight:600;margin:0 0 8px;">You're invited!</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin:0 0 24px;">
        <strong style="color:#ffffff;">${escapeHtml(coachName || "Your coach")}</strong> has invited
        ${clientName ? ` you, <strong style="color:#ffffff;">${escapeHtml(clientName)}</strong>,` : " you"}
        to join their <strong style="color:#00e5c8;">${escapeHtml(plan || "Basic")}</strong> coaching program on FitCore.
      </p>
      <a href="${inviteLink}"
         style="display:inline-block;padding:14px 32px;background:#00e5c8;color:#07090e;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:-0.3px;">
        Create Your Account
      </a>
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin-top:20px;">
        This invite expires in 7 days.
      </p>
    </div>

    <!-- Footer -->
    <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:24px;line-height:1.6;">
      FitCore &mdash; The dashboard your coaching business needs<br/>
      <a href="https://fitcore.tech" style="color:rgba(255,255,255,0.3);text-decoration:none;">fitcore.tech</a>
    </p>
  </div>
</body>
</html>`;
}
