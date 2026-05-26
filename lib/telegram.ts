/**
 * Telegram Bot API helpers for rate-alert and fee-alert delivery.
 *
 * Requires TELEGRAM_BOT_TOKEN env var (set in Vercel production settings).
 * When unset all helpers are no-ops so the alerts cron continues to work
 * via email/push without Telegram configured.
 *
 * Bot setup (one-time, by a human):
 *   1. Message @BotFather on Telegram: /newbot → get the token
 *   2. Set TELEGRAM_BOT_TOKEN in Vercel env vars
 *   3. Register the webhook once:
 *      curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *        -d '{"url":"https://invest.com.au/api/webhooks/telegram","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
 *   4. Users message the bot /start <email> to subscribe their chat_id to alerts
 *
 * Distribution — E1 (BUILD-EVERYTHING-QUEUE.md)
 */

import { logger } from "@/lib/logger";

const log = logger("telegram");

const TELEGRAM_API = "https://api.telegram.org";

/** Returns the bot token or null when unconfigured. */
export function getTelegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || token.length < 10) return null;
  return token;
}

/** Returns true when the bot is configured for this environment. */
export function isTelegramConfigured(): boolean {
  return getTelegramBotToken() !== null;
}

/**
 * Verify the X-Telegram-Bot-Api-Secret-Token header matches
 * TELEGRAM_WEBHOOK_SECRET. Telegram sends this header on every webhook
 * call when the secret was supplied during setWebhook.
 */
export function verifyTelegramWebhookSecret(headerValue: string | null): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  return headerValue === secret;
}

/**
 * Send a text message to a chat (user or group). Markdown V2 parse_mode.
 * Returns false and logs on failure — never throws.
 */
export async function sendTelegramMessage(
  chatId: number | bigint,
  text: string,
): Promise<boolean> {
  const token = getTelegramBotToken();
  if (!token) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: Number(chatId),
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { description?: string };
      log.warn("Telegram sendMessage failed", {
        chatId: Number(chatId),
        status: res.status,
        description: body.description ?? "unknown",
      });
      return false;
    }
    return true;
  } catch (err) {
    log.error("Telegram sendMessage threw", {
      chatId: Number(chatId),
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Escape a string for Telegram MarkdownV2 mode.
 * Telegram requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
 */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`);
}

/**
 * Format a rate-alert notification message in MarkdownV2.
 * Kept short (≤200 chars) so it renders well in Telegram notification previews.
 */
export function formatRateAlertMessage({
  metricLabel,
  direction,
  oldRatePct,
  newRatePct,
  productName,
  deepLinkUrl,
}: {
  metricLabel: string;
  direction: "above" | "below";
  oldRatePct: string;
  newRatePct: string;
  productName: string;
  deepLinkUrl: string;
}): string {
  const arrow = direction === "above" ? "📈" : "📉";
  const name = escapeMarkdownV2(productName);
  const metric = escapeMarkdownV2(metricLabel);
  const old_ = escapeMarkdownV2(oldRatePct);
  const new_ = escapeMarkdownV2(newRatePct);
  const url = escapeMarkdownV2(deepLinkUrl);
  return `${arrow} *${name}* ${metric} alert\n${old_} → *${new_}*\n[View →](${url})`;
}

/**
 * Deliver a rate-alert message to all confirmed Telegram subscribers
 * matching the given email list. Best-effort — errors are logged but
 * never propagated to the caller (cron must continue even if Telegram fails).
 */
export async function dispatchTelegramAlerts(
  recipients: { chatId: bigint | number; email: string }[],
  message: string,
): Promise<void> {
  if (!isTelegramConfigured() || recipients.length === 0) return;
  const results = await Promise.allSettled(
    recipients.map(({ chatId }) => sendTelegramMessage(chatId, message)),
  );
  const failures = results.filter((r) => r.status === "rejected").length;
  if (failures > 0) {
    log.warn("Telegram dispatch partial failures", { total: recipients.length, failures });
  }
}
