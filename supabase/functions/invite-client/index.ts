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

    // Client with the coach's JWT — for permission checks
    const supabaseCoach = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Verify the JWT and get the coach user
    const { data: { user: coachUser }, error: authError } = await supabaseCoach.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !coachUser) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Parse request body ──
    const { clientId, email, name } = await req.json();

    if (!clientId || !email) {
      return new Response(JSON.stringify({ error: "clientId and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Admin client (service role key) for privileged operations ──
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ── 4. Verify coach owns this client ──
    const { data: clientRow, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, coach_id, auth_user_id, email")
      .eq("id", clientId)
      .single();

    if (clientError || !clientRow) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (clientRow.coach_id !== coachUser.id) {
      return new Response(JSON.stringify({ error: "You don't own this client" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (clientRow.auth_user_id) {
      return new Response(JSON.stringify({ error: "Client already has login credentials" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 5. Generate secure temp password ──
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const randomBytes = new Uint8Array(12);
    crypto.getRandomValues(randomBytes);
    const tempPassword = Array.from(randomBytes)
      .map((b) => chars[b % chars.length])
      .join("");

    // ── 6. Create auth user with admin API ──
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true, // Skip email verification
      user_metadata: {
        role: "client",
        name: name || email.split("@")[0],
        client_id: clientId,
      },
    });

    if (createError) {
      // Handle duplicate email
      if (createError.message?.includes("already been registered")) {
        return new Response(JSON.stringify({ error: "This email is already registered" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 7. Link auth user to client row ──
    const { error: updateError } = await supabaseAdmin
      .from("clients")
      .update({ auth_user_id: newUser.user.id })
      .eq("id", clientId);

    if (updateError) {
      // Rollback: delete the auth user if we can't link it
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: "Failed to link account to client" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 8. Success ──
    return new Response(
      JSON.stringify({
        success: true,
        tempPassword,
        authUserId: newUser.user.id,
      }),
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
