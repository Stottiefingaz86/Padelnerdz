import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type Body = {
  kind: "group" | "session_room" | "dm";
  channelId: string;
  messageId: string;
  title: string;
  body: string;
  href: string;
  senderId: string | null;
};

async function sendExpo(messages: Array<Record<string, unknown>>) {
  if (messages.length === 0) return;
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    console.error("expo push failed", await res.text());
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = (await req.json()) as Body;
  const admin = createClient(supabaseUrl, serviceKey);

  let recipientIds: string[] = [];

  if (payload.kind === "group") {
    const { data: members } = await admin
      .from("group_memberships")
      .select("user_id")
      .eq("group_id", payload.channelId);
    recipientIds = (members ?? []).map((m) => m.user_id as string);

    const { data: mutes } = await admin
      .from("channel_notification_prefs")
      .select("user_id")
      .eq("channel_id", payload.channelId)
      .eq("muted", true);
    const muted = new Set((mutes ?? []).map((m) => m.user_id as string));
    recipientIds = recipientIds.filter((id) => !muted.has(id));
  } else if (payload.kind === "session_room") {
    const { data: members } = await admin
      .from("session_room_members")
      .select("user_id")
      .eq("session_room_id", payload.channelId);
    recipientIds = (members ?? []).map((m) => m.user_id as string);
  } else if (payload.kind === "dm") {
    const { data: thread } = await admin
      .from("dm_threads")
      .select("user_a, user_b")
      .eq("id", payload.channelId)
      .maybeSingle();
    if (thread) {
      recipientIds = [thread.user_a as string, thread.user_b as string];
    }
  }

  recipientIds = [
    ...new Set(
      recipientIds.filter(
        (id) => id && id !== payload.senderId && id !== user.id,
      ),
    ),
  ];

  if (recipientIds.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: tokens } = await admin
    .from("device_push_tokens")
    .select("token, user_id")
    .in("user_id", recipientIds);

  const messages = (tokens ?? []).map((t) => ({
    to: t.token as string,
    title: payload.title,
    body: payload.body.slice(0, 180),
    sound: "default",
    data: {
      href: payload.href,
      channelId: payload.channelId,
      messageId: payload.messageId,
      kind: payload.kind,
    },
  }));

  await sendExpo(messages);

  return new Response(JSON.stringify({ ok: true, sent: messages.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
