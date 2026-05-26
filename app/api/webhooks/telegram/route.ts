/**
 * Telegram Bot webhook — handles incoming messages from the bot.
 *
 * Register with Telegram once (human action):
 *   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *     -d '{"url":"https://invest.com.au/api/webhooks/telegram","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
 *
 * Supported commands:
 *   /start <email>  — link chat_id to an email address and subscribe to alerts
 *   /stop           — deactivate this chat's alert subscription
 *   /status         — report subscription status for this chat
 *
 * All commands are idempotent and upsert-safe.
 *
 * E1 — distribution stream (BUILD-EVERYTHING-QUEUE.md)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  verifyTelegramWebhookSecret,
  sendTelegramMessage,
  escapeMarkdownV2,
  isTelegramConfigured,
} from "@/lib/telegram";
import { isValidEmail } from "@/lib/validate-email";

const log = logger("webhook:telegram");

// Telegram update — only the fields we use
const TelegramUpdateSchema = z.object({
  message: z
    .object({
      chat: z.object({ id: z.number() }),
      from: z.object({ id: z.number(), first_name: z.string().optional() }).optional(),
      text: z.string().optional(),
    })
    .optional(),
});

type TelegramUpdate = z.infer<typeof TelegramUpdateSchema>;

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const firstName = message.from?.first_name ?? "there";

  if (text.startsWith("/start")) {
    await handleStart(chatId, text, firstName);
  } else if (text.startsWith("/stop")) {
    await handleStop(chatId, firstName);
  } else if (text.startsWith("/status")) {
    await handleStatus(chatId, firstName);
  } else {
    await sendTelegramMessage(
      chatId,
      `Hi ${escapeMarkdownV2(firstName)}\\! I can help you get rate alerts\\.\n\n` +
        `Commands:\n` +
        `\\/start your@email\\.com — subscribe to alerts\n` +
        `\\/stop — unsubscribe\n` +
        `\\/status — check your subscription`,
    );
  }
}

async function handleStart(chatId: number, text: string, firstName: string): Promise<void> {
  // Extract email from "/start email@example.com"
  const parts = text.split(/\s+/);
  const email = parts[1]?.toLowerCase().trim() ?? null;

  if (!email || !isValidEmail(email)) {
    await sendTelegramMessage(
      chatId,
      `Hi ${escapeMarkdownV2(firstName)}\\! To subscribe to rate alerts, send:\n\n` +
        `\\/start your@email\\.com\n\n` +
        `Use the same email you signed up with on invest\\.com\\.au`,
    );
    return;
  }

  const supabase = createAdminClient();

  // Confirm the email exists in quiz_leads or email_captures (loose check — we
  // don't want to leak whether an email is registered, but we do confirm it
  // before activating Telegram delivery to avoid abuse).
  const { count } = await supabase
    .from("email_captures")
    .select("email", { count: "exact", head: true })
    .eq("email", email.slice(0, 254))
    .limit(1);

  const emailKnown = (count ?? 0) > 0;

  const { error } = await supabase.from("telegram_subscriptions").upsert(
    {
      telegram_chat_id: chatId,
      email: email.slice(0, 254),
      rate_alerts: true,
      fee_alerts: true,
      confirmed: emailKnown,
      active: true,
    },
    { onConflict: "telegram_chat_id,email" },
  );

  if (error) {
    log.error("telegram_subscriptions upsert failed", { error: error.message, chatId });
    await sendTelegramMessage(chatId, "Something went wrong\\. Please try again later\\.");
    return;
  }

  if (emailKnown) {
    await sendTelegramMessage(
      chatId,
      `✅ You're subscribed\\! Rate and fee alerts for ${escapeMarkdownV2(email)} will be delivered here\\.\n\n` +
        `Send \\/stop to unsubscribe at any time\\.`,
    );
  } else {
    await sendTelegramMessage(
      chatId,
      `We don't have ${escapeMarkdownV2(email)} in our system yet\\.\n\n` +
        `Subscribe to alerts first at [invest\\.com\\.au/fee\\-alerts](https://invest.com.au/fee-alerts) then come back here and run \\/start again\\.`,
    );
  }
}

async function handleStop(chatId: number, firstName: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("telegram_subscriptions")
    .update({ active: false })
    .eq("telegram_chat_id", chatId);

  if (error) {
    log.error("telegram stop update failed", { error: error.message, chatId });
    await sendTelegramMessage(chatId, "Something went wrong\\. Please try again later\\.");
    return;
  }

  await sendTelegramMessage(
    chatId,
    `👋 Bye ${escapeMarkdownV2(firstName)}\\! Telegram alerts are paused\\.\n\nSend \\/start your@email\\.com to re\\-subscribe\\.`,
  );
}

async function handleStatus(chatId: number, firstName: string): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("telegram_subscriptions")
    .select("email, rate_alerts, fee_alerts, confirmed, active")
    .eq("telegram_chat_id", chatId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    await sendTelegramMessage(
      chatId,
      `Hi ${escapeMarkdownV2(firstName)}\\! No subscription found\\.\n\nSend \\/start your@email\\.com to subscribe\\.`,
    );
    return;
  }

  const statusLine = data.active && data.confirmed ? "✅ Active" : "⏸ Paused";
  await sendTelegramMessage(
    chatId,
    `${statusLine}\n` +
      `Email: ${escapeMarkdownV2(data.email)}\n` +
      `Rate alerts: ${data.rate_alerts ? "on" : "off"}\n` +
      `Fee alerts: ${data.fee_alerts ? "on" : "off"}`,
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  // Verify the secret token Telegram sends on every webhook call
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!verifyTelegramWebhookSecret(secret)) {
    log.warn("Telegram webhook: invalid secret token");
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = TelegramUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    // Unknown update type (e.g. channel post) — acknowledge silently
    return NextResponse.json({ ok: true });
  }

  // Process asynchronously — Telegram expects a fast 200 response
  handleUpdate(parsed.data).catch((err) => {
    log.error("telegram handleUpdate threw", {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return NextResponse.json({ ok: true });
}
