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
    const { code, name, email, password } = await req.json();

    if (!code || !name || !email || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ── 1. Validate invite code ──
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invite_codes")
      .select("coach_id, client_name, client_email, plan, used_by, expires_at")
      .eq("code", code)
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "Invalid invite code" }), {
        status: 404,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (invite.used_by) {
      return new Response(JSON.stringify({ error: "Invite code already used" }), {
        status: 409,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Invite code expired" }), {
        status: 410,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── 2. Create auth user (skip email confirmation for invited clients) ──
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        role: "client",
        name: name.trim(),
      },
    });

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        return new Response(JSON.stringify({ error: "emailExists" }), {
          status: 409,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── 3. Create client row ──
    const clientId = crypto.randomUUID();
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { error: clientError } = await supabaseAdmin.from("clients").insert({
      id: clientId,
      coach_id: invite.coach_id,
      auth_user_id: newUser.user.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      plan: invite.plan || "Basic",
      status: "active",
      start_date: today,
      next_check_in: nextWeek.toISOString().split("T")[0],
      monthly_rate: invite.plan === "Elite" ? 299 : invite.plan === "Premium" ? 199 : 99,
      progress: 0,
      streak: 0,
      goals: [],
      notes: "",
    });

    if (clientError) {
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: "Failed to create client profile" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── 4. Mark invite code as used ──
    await supabaseAdmin
      .from("invite_codes")
      .update({ used_by: clientId })
      .eq("code", code);

    // ── 5. Success - client can now sign in ──
    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
