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

    // Verify the JWT and get the coach user
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

    // ── 2. Parse request body - require email confirmation ──
    const { confirmEmail } = await req.json();

    if (!confirmEmail || confirmEmail.toLowerCase() !== coachUser.email?.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Email confirmation does not match" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── 3. Admin client for privileged operations ──
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ── 4. Get coach row ──
    const { data: coachRow } = await supabaseAdmin
      .from("coaches")
      .select("id")
      .eq("id", coachUser.id)
      .maybeSingle();

    // ── 5. Find all clients belonging to this coach ──
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("id, auth_user_id")
      .eq("coach_id", coachUser.id);

    const clientIds = clients?.map(c => c.id) ?? [];

    // ── 6. Delete all client-related data (child tables first) ──
    if (clientIds.length > 0) {
      // check_in_photos → depends on check_ins
      const { data: checkIns } = await supabaseAdmin
        .from("check_ins")
        .select("id")
        .in("client_id", clientIds);
      const checkInIds = checkIns?.map(c => c.id) ?? [];
      if (checkInIds.length > 0) {
        await supabaseAdmin.from("check_in_photos").delete().in("check_in_id", checkInIds);
      }

      // Delete all child tables that reference client_id
      await supabaseAdmin.from("workout_set_logs").delete().in("client_id", clientIds);
      await supabaseAdmin.from("workout_logs").delete().in("client_id", clientIds);
      await supabaseAdmin.from("check_ins").delete().in("client_id", clientIds);
      await supabaseAdmin.from("messages").delete().in("client_id", clientIds);
      await supabaseAdmin.from("program_clients").delete().in("client_id", clientIds);
      await supabaseAdmin.from("client_metrics").delete().in("client_id", clientIds);
      await supabaseAdmin.from("invoices").delete().in("client_id", clientIds);
      await supabaseAdmin.from("push_subscriptions").delete().in("client_id", clientIds);
      await supabaseAdmin.from("weekly_schedule").delete().in("client_id", clientIds);

      // Delete client auth users
      for (const client of clients!) {
        if (client.auth_user_id) {
          await supabaseAdmin.auth.admin.deleteUser(client.auth_user_id);
        }
      }

      // Delete client rows
      await supabaseAdmin.from("clients").delete().in("id", clientIds);
    }

    // ── 7. Delete coach-level data ──
    // workout_days → exercises depend on workout_programs
    const { data: programs } = await supabaseAdmin
      .from("workout_programs")
      .select("id")
      .eq("coach_id", coachUser.id);
    const programIds = programs?.map(p => p.id) ?? [];
    if (programIds.length > 0) {
      await supabaseAdmin.from("exercises").delete().in("workout_day_id",
        (await supabaseAdmin.from("workout_days").select("id").in("program_id", programIds)).data?.map(d => d.id) ?? []
      );
      await supabaseAdmin.from("workout_days").delete().in("program_id", programIds);
      await supabaseAdmin.from("program_clients").delete().in("program_id", programIds);
      await supabaseAdmin.from("workout_programs").delete().in("id", programIds);
    }

    await supabaseAdmin.from("coaching_plans").delete().eq("coach_id", coachUser.id);
    await supabaseAdmin.from("invite_codes").delete().eq("coach_id", coachUser.id);
    await supabaseAdmin.from("push_subscriptions").delete().eq("coach_id", coachUser.id);

    // Delete coach row
    if (coachRow) {
      await supabaseAdmin.from("coaches").delete().eq("id", coachUser.id);
    }

    // ── 8. Delete the coach's auth user ──
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(coachUser.id);

    if (deleteError) {
      return new Response(JSON.stringify({ error: "Failed to delete account: " + deleteError.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // ── 7. Success ──
    return new Response(
      JSON.stringify({ success: true }),
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
