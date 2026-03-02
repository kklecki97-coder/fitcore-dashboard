import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    // 1. Verify client JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Parse request body
    const { clientName, checkInDate } = await req.json();

    // 3. Look up the client row → get coach_id
    const { data: clientRow, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("coach_id, name")
      .eq("auth_user_id", user.id)
      .single();

    if (clientError || !clientRow) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Get coach email from auth
    const { data: coachAuth, error: coachError } =
      await supabaseAdmin.auth.admin.getUserById(clientRow.coach_id);

    if (coachError || !coachAuth?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Coach not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const coachEmail = coachAuth.user.email;
    const name = clientName || clientRow.name || "A client";

    // 5. Send email via Resend
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const html = buildEmailHtml({ clientName: name, checkInDate });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FitCore <noreply@mail.fitcore.tech>",
        to: [coachEmail],
        subject: `New check-in from ${name}`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      return new Response(
        JSON.stringify({ error: "Failed to send email", detail: errBody }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function buildEmailHtml({
  clientName,
  checkInDate,
}: {
  clientName: string;
  checkInDate: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07090e;font-family:'Outfit',Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <img src="https://fitcore.tech/fitcore-logo.png" width="48" height="48" alt="FitCore" style="border-radius:50%;" />
      <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:12px 0 4px;letter-spacing:-0.5px;">FitCore</h1>
    </div>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px 24px;text-align:center;">
      <h2 style="color:#ffffff;font-size:20px;font-weight:600;margin:0 0 8px;">New Check-in</h2>
      <p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin:0 0 24px;">
        <strong style="color:#ffffff;">${clientName}</strong> submitted a check-in${checkInDate ? ` for <strong style="color:#00e5c8;">${checkInDate}</strong>` : ""}.
        Log in to review it.
      </p>
      <a href="https://app.fitcore.tech"
         style="display:inline-block;padding:14px 32px;background:#00e5c8;color:#07090e;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:-0.3px;">
        Open Dashboard
      </a>
    </div>
    <p style="color:rgba(255,255,255,0.2);font-size:11px;text-align:center;margin-top:24px;line-height:1.6;">
      FitCore &mdash; The dashboard your coaching business needs<br/>
      <a href="https://fitcore.tech" style="color:rgba(255,255,255,0.3);text-decoration:none;">fitcore.tech</a>
    </p>
  </div>
</body>
</html>`;
}
