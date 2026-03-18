import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Parse request body - require email confirmation ──
    const { confirmEmail } = await req.json();

    if (!confirmEmail || confirmEmail.toLowerCase() !== coachUser.email?.toLowerCase()) {
      return new Response(JSON.stringify({ error: "Email confirmation does not match" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Admin client for privileged operations ──
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ── 4. Find all client auth users that belong to this coach ──
    // These are clients who were invited and have portal login accounts
    const { data: clients } = await supabaseAdmin
      .from("clients")
      .select("auth_user_id")
      .eq("coach_id", coachUser.id)
      .not("auth_user_id", "is", null);

    // ── 5. Delete client auth users first ──
    if (clients && clients.length > 0) {
      for (const client of clients) {
        if (client.auth_user_id) {
          await supabaseAdmin.auth.admin.deleteUser(client.auth_user_id);
        }
      }
    }

    // ── 6. Delete the coach's auth user ──
    // This cascades: auth.users → coaches → clients → all child tables
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(coachUser.id);

    if (deleteError) {
      return new Response(JSON.stringify({ error: "Failed to delete account: " + deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 7. Success ──
    return new Response(
      JSON.stringify({ success: true }),
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
