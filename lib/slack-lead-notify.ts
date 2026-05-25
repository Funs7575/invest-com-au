/**
 * Sends a Slack Incoming Webhook message when a lead is matched to an advisor.
 * Uses Slack Block Kit for a structured, scannable notification.
 *
 * Slack Incoming Webhooks don't require signing — the URL itself is the
 * credential. Never log or expose the URL.
 *
 * Called from /api/internal/lead-webhooks (Node runtime) so fire-and-forget
 * from the edge submit-lead route is safe.
 */

const NEED_LABELS: Record<string, string> = {
  planning: "Financial Planning",
  mortgage: "Mortgage Broking",
  tax: "Tax Advice",
  smsf: "SMSF",
  estate: "Estate Planning",
  insurance: "Insurance",
  wealth: "Wealth Management",
  crypto: "Crypto Advice",
  buyers: "Buyers Agent",
  property: "Property Advice",
  agedcare: "Aged Care",
};

export interface LeadPayload {
  userName: string | null;
  userEmail: string;
  userPhone: string | null;
  userState: string | null;
  need: string;
  context: string[];
  leadId: string | number | null;
  sourcePage: string | null;
}

export async function sendSlackLeadNotification(
  slackWebhookUrl: string,
  lead: LeadPayload,
): Promise<void> {
  const needLabel = NEED_LABELS[lead.need] ?? lead.need;
  const contextStr =
    lead.context.length > 0
      ? lead.context.map((c) => c.replace(/_/g, " ")).join(", ")
      : "General enquiry";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "New lead — Invest.com.au",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Name*\n${lead.userName ?? "Not provided"}`,
        },
        {
          type: "mrkdwn",
          text: `*Need*\n${needLabel}`,
        },
        {
          type: "mrkdwn",
          text: `*Email*\n${lead.userEmail}`,
        },
        {
          type: "mrkdwn",
          text: `*Phone*\n${lead.userPhone ?? "Not provided"}`,
        },
        {
          type: "mrkdwn",
          text: `*State*\n${lead.userState ?? "Not specified"}`,
        },
        {
          type: "mrkdwn",
          text: `*Context*\n${contextStr}`,
        },
      ],
    },
    {
      type: "divider",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Lead ID: ${lead.leadId ?? "—"} • Source: ${lead.sourcePage ?? "direct"} • Reply within 60 min for best conversion`,
        },
      ],
    },
  ];

  await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
    // 8-second timeout — Slack is fast; don't block the caller longer than this
    signal: AbortSignal.timeout(8_000),
  });
}
