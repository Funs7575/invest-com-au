import { logger } from "@/lib/logger";

const log = logger("slack-webhook");

// Thin Slack-incoming-webhook dispatcher. Mirrors lib/sms.ts in shape
// (env-gated, fail-soft, single bottleneck). Pre-launch: SLACK_*
// env vars are unset, so postToSlack() returns { ok: false } without
// throwing — callers can fire-and-forget. Once a webhook URL is in
// Vercel, fee-change cron, slo-monitor cron, and any other operational
// surface that wants Slack notifications can call this directly.
//
// Why incoming webhooks not the Slack API: webhooks need no token, no
// scopes, no app install — the simplest 1-line "I want to send to this
// channel" path. Fine for one-way notifications.

const SLACK_TIMEOUT_MS = 10_000;

export type SlackChannel = "fee-changes" | "ops-alerts" | "slo-alerts" | "default";

interface PostOptions {
  channel?: SlackChannel;
  text: string;
  /** Slack-formatted blocks for richer messages. Falls back to `text` when not set. */
  blocks?: unknown[];
}

function webhookUrlFor(channel: SlackChannel): string | null {
  switch (channel) {
    case "fee-changes":
      return process.env.SLACK_WEBHOOK_FEE_CHANGES || process.env.SLACK_WEBHOOK_DEFAULT || null;
    case "ops-alerts":
      return process.env.SLACK_WEBHOOK_OPS_ALERTS || process.env.SLACK_WEBHOOK_DEFAULT || null;
    case "slo-alerts":
      return process.env.SLACK_WEBHOOK_SLO_ALERTS || process.env.SLACK_WEBHOOK_DEFAULT || null;
    case "default":
    default:
      return process.env.SLACK_WEBHOOK_DEFAULT || null;
  }
}

export async function postToSlack(opts: PostOptions): Promise<{ ok: boolean; error?: string }> {
  const url = webhookUrlFor(opts.channel ?? "default");
  if (!url) {
    log.warn("SLACK_WEBHOOK_* not set — skipping post", { channel: opts.channel });
    return { ok: false, error: "No webhook configured" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: opts.text, blocks: opts.blocks }),
      signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log.warn(`Slack HTTP ${res.status}`, { error: body });
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.warn("Slack post failed", { error: msg });
    return { ok: false, error: msg };
  }
}
