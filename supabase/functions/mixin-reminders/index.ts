import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Finds mix-ins starting in ~55–65 minutes and pushes involved players.
 * Schedule every 5–10 minutes (Supabase cron / external scheduler).
 */
async function sendExpo(messages: Array<Record<string, unknown>>) {
  if (messages.length === 0) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (secret) {
    const hdr = req.headers.get("x-cron-secret") ?? "";
    if (hdr !== secret) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const now = Date.now();
  const windowStart = new Date(now + 55 * 60 * 1000).toISOString();
  const windowEnd = new Date(now + 65 * 60 * 1000).toISOString();

  const { data: sessions, error } = await admin
    .from("sessions")
    .select("id, title, starts_at, group_id")
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;

  for (const session of sessions ?? []) {
    const { data: regs } = await admin
      .from("session_registrations")
      .select("user_id, status")
      .eq("session_id", session.id)
      .in("status", [
        "registered",
        "selected",
        "paid",
        "payment_claimed",
        "waitlist",
      ]);

    for (const reg of regs ?? []) {
      const userId = reg.user_id as string;
      const { error: dupErr } = await admin.from("session_reminder_sent").insert({
        session_id: session.id,
        user_id: userId,
        kind: "1h",
      });
      if (dupErr) continue;

      const { data: tokens } = await admin
        .from("device_push_tokens")
        .select("token")
        .eq("user_id", userId);

      const messages = (tokens ?? []).map((t) => ({
        to: t.token as string,
        title: "Mix-in in 1 hour",
        body: `${session.title} starts soon — get ready.`,
        sound: "default",
        data: {
          href: `/group/${session.group_id}/session/${session.id}`,
          sessionId: session.id,
          kind: "mixin_reminder",
        },
      }));

      await sendExpo(messages);
      sent += messages.length;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sessions: (sessions ?? []).length, sent }),
    { headers: { "Content-Type": "application/json" } },
  );
});
