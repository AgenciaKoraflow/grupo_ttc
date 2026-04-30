import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return json({ error: "Missing authorization header" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify caller JWT and check admin role
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) return json({ error: "Unauthorized" }, 401);

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "admin")
      return json({ error: "Forbidden: admin role required" }, 403);

    const body = await req.json();
    const { action } = body;

    // ── CREATE ──────────────────────────────────────────────────────────────────
    if (action === "create") {
      const { nome, email, role, equipe_id } = body;

      if (!nome?.trim() || !email?.trim() || !role) {
        return json(
          { error: "Missing required fields: nome, email, role" },
          400,
        );
      }
      if (!["admin", "supervisor", "operador"].includes(role)) {
        return json(
          { error: "Invalid role. Must be admin, supervisor or operador" },
          400,
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return json({ error: "Invalid email format" }, 400);
      }

      // Temporary password: prefix + 10 random hex chars + suffix guarantees
      // uppercase, lowercase, digit and special char in ~18 chars
      const tempPassword = `Ttc${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!1`;

      const { data: authData, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: { nome: nome.trim(), role },
        });
      if (createErr) return json({ error: createErr.message }, 400);

      const userId = authData.user.id;

      // The handle_new_user trigger already inserted the profile row (id, nome, email, role).
      // Upsert to set equipe_id and must_change_password (trigger does not set these).
      const { data: profile, error: upsertErr } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          role,
          equipe_id: equipe_id ?? null,
          must_change_password: true,
        })
        .select()
        .single();

      if (upsertErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return json({ error: upsertErr.message }, 500);
      }

      return json({ profile, tempPassword });
    }

    // ── DELETE ──────────────────────────────────────────────────────────────────
    if (action === "delete") {
      const { user_id } = body;
      if (!user_id)
        return json({ error: "Missing required field: user_id" }, 400);

      // Deleting auth.user cascades to profiles (FK ON DELETE CASCADE).
      // All ocorrencias FKs (assigned_to, finalized_by, etc.) become NULL automatically.
      const { error: deleteErr } =
        await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (deleteErr) return json({ error: deleteErr.message }, 400);

      return json({ success: true });
    }

    // ── UPDATE-EMAIL ─────────────────────────────────────────────────────────────
    if (action === "update-email") {
      const { user_id, email } = body;
      if (!user_id || !email?.trim()) {
        return json({ error: "Missing required fields: user_id, email" }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return json({ error: "Invalid email format" }, 400);
      }

      // Updating auth.users.email triggers sync_profile_email → profiles.email synced automatically.
      const { error: updateErr } =
        await supabaseAdmin.auth.admin.updateUserById(user_id, {
          email: email.trim().toLowerCase(),
        });
      if (updateErr) return json({ error: updateErr.message }, 400);

      return json({ success: true });
    }

    // ── RESET-PASSWORD ───────────────────────────────────────────────────────────
    if (action === "reset-password") {
      const { user_id } = body;
      if (!user_id) return json({ error: "Missing required field: user_id" }, 400);

      const tempPassword = `Ttc${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!1`;

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { password: tempPassword },
      );
      if (updateErr) return json({ error: updateErr.message }, 400);

      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .update({ must_change_password: true })
        .eq("id", user_id);
      if (profileErr) return json({ error: profileErr.message }, 500);

      return json({ tempPassword });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
