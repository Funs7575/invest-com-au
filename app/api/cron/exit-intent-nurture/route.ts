import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { SITE_URL } from "@/lib/seo";

const log = logger("cron:exit-intent-nurture");

export const maxDuration = 60;

/**
 * Exit-intent email nurture sequence.
 *
 * Three emails to every email_captures row that came in via the
 * exit-intent modal (source='exit_intent'):
 *
 *   T+2 days  — "Your broker finder results" (re-engage)
 *   T+5 days  — "The 3 brokers we'd pick today" (educate)
 *   T+9 days  — "How I'd structure $50k today" (convert)
 *
 * Suppression: unsubscribed=true, status='suppressed', or email
 * appears in email_suppression_list are all skipped.
 *
 * Max 100 sends per run to stay within Resend + cron limits. Cron
 * runs daily-12 (noon AEST) when inboxes are most active.
 */

const MAX_SENDS_PER_RUN = 100;

interface NurtureEmail {
  stage: 1 | 2 | 3;
  sentField: "nurture_email_1_sent_at" | "nurture_email_2_sent_at" | "nurture_email_3_sent_at";
  minAgeDays: number;
  subject: string;
  render: (firstName: string) => string;
}

const EMAILS: NurtureEmail[] = [
  {
    stage: 1,
    sentField: "nurture_email_1_sent_at",
    minAgeDays: 2,
    subject: "Your broker finder results — a quick follow-up",
    render: (firstName) => templateEmail({
      greeting: `Hi ${firstName},`,
      body: [
        "You recently checked out invest.com.au — thanks for stopping by.",
        "If you're still comparing Australian brokers, here are three starting points that genuinely save our readers the most money:",
      ],
      bullets: [
        { label: "Should-I-switch calculator", href: "/tools/should-i-switch", sub: "Enter your current broker and trade profile — we compute $ savings across every alternative." },
        { label: "Compare broker fees", href: "/compare", sub: "Side-by-side ASX + US brokerage, FX rates, CHESS sponsorship, minimum deposits." },
        { label: "Best for low fees", href: "/best/low-fees", sub: "Our editorial top-3 picks specifically for keeping costs low." },
      ],
      closing: "Reply to this email if you have a specific situation and want a pointer — we read every one.",
    }),
  },
  {
    stage: 2,
    sentField: "nurture_email_2_sent_at",
    minAgeDays: 5,
    subject: "The 3 brokers we'd pick today (and why)",
    render: (firstName) => templateEmail({
      greeting: `Hi ${firstName},`,
      body: [
        "If we were starting an Australian portfolio from zero today with no broker relationship to preserve, here's what we'd do:",
      ],
      bullets: [
        { label: "For long-term DCA — Pearler ($6.50 flat + auto-invest)", href: "/broker/pearler", sub: "Scheduled monthly ETF buys with CHESS sponsorship. Set and forget." },
        { label: "For US investing — Interactive Brokers (0.002% FX)", href: "/broker/interactive-brokers", sub: "The cheapest FX in Australia by far. Matters on every international trade." },
        { label: "For SMSF — SelfWealth ($9.50 flat + CHESS + SMSF)", href: "/broker/selfwealth", sub: "Clean SMSF reporting, CHESS-sponsored shares in your name." },
      ],
      closing: "These aren't sponsored recommendations. They're what the editorial team uses themselves.",
    }),
  },
  {
    stage: 3,
    sentField: "nurture_email_3_sent_at",
    minAgeDays: 9,
    subject: "How we'd structure a $50k portfolio today",
    render: (firstName) => templateEmail({
      greeting: `Hi ${firstName},`,
      body: [
        "If someone landed in our inbox with $50k and asked how to deploy it for long-term growth, here's roughly the answer we'd give. Not personal advice — general framework only.",
      ],
      bullets: [
        { label: "50% — ASX diversified ETF", href: "/etfs", sub: "VAS or A200 for broad Australian market exposure. Pay 0.10% or less in MER." },
        { label: "30% — International developed markets", href: "/etfs/international", sub: "VGS, IWLD, or similar. Covers US, Europe, Japan. The US accounts for most of the return historically." },
        { label: "10% — Australian bonds", href: "/invest/bonds", sub: "VAF or IAF for defensive weighting. Dampens drawdowns during sharemarket falls." },
        { label: "10% — Cash / short-term deposits", href: "/savings", sub: "Liquidity for opportunistic buys or 6-12 months of expenses." },
      ],
      closing: "Always get licensed advice for your specific situation. This is an educational framework, not a personal recommendation.",
    }),
  },
];

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = Date.now();
  let totalSent = 0;
  const stageCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  for (const email of EMAILS) {
    const minAgeCutoff = new Date(
      now - email.minAgeDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Previous stage must be sent (or this is stage 1) and this stage
    // must not be sent.
    const prevSentField =
      email.stage === 1
        ? null
        : email.stage === 2
          ? "nurture_email_1_sent_at"
          : "nurture_email_2_sent_at";

    let query = supabase
      .from("email_captures")
      .select("id, email, name")
      .eq("unsubscribed", false)
      .neq("status", "suppressed")
      .eq("source", "exit_intent")
      .lt("captured_at", minAgeCutoff)
      .is(email.sentField, null);
    if (prevSentField) {
      query = query.not(prevSentField, "is", null);
    }

    const perEmailBudget = Math.floor(
      (MAX_SENDS_PER_RUN - totalSent) / Math.max(1, EMAILS.length - email.stage + 1),
    );
    if (perEmailBudget <= 0) break;

    const { data: rows } = await query
      .order("captured_at", { ascending: true })
      .limit(perEmailBudget);

    if (!rows || rows.length === 0) continue;

    // Skip anyone on the suppression list
    const emails = rows.map((r) => r.email);
    const { data: suppressed } = await supabase
      .from("email_suppression_list")
      .select("email")
      .in("email", emails);
    const suppressedSet = new Set(
      (suppressed ?? []).map((s) => s.email as string),
    );

    for (const row of rows) {
      if (suppressedSet.has(row.email)) continue;

      const firstName = firstNameOf(row.name, row.email);
      const html = email.render(firstName);
      const result = await sendEmail({
        to: row.email,
        subject: email.subject,
        html,
      });

      if (result.ok) {
        await supabase
          .from("email_captures")
          .update({ [email.sentField]: new Date().toISOString() })
          .eq("id", row.id);
        totalSent++;
        stageCounts[email.stage] = (stageCounts[email.stage] ?? 0) + 1;
      } else {
        log.warn("nurture_send_failed", {
          email: row.email,
          stage: email.stage,
          err: result.error,
        });
      }

      if (totalSent >= MAX_SENDS_PER_RUN) break;
    }

    if (totalSent >= MAX_SENDS_PER_RUN) break;
  }

  return NextResponse.json({ ok: true, sent: totalSent, by_stage: stageCounts });
}

function firstNameOf(name: string | null | undefined, email: string): string {
  if (name && typeof name === "string" && name.trim()) {
    return name.trim().split(/\s+/)[0]!;
  }
  // Fallback to the email's local-part capitalised
  const local = email.split("@")[0] ?? "there";
  const simple = local.replace(/[._-]+/g, " ").split(" ")[0] ?? "there";
  return simple.charAt(0).toUpperCase() + simple.slice(1).toLowerCase();
}

/** Minimal branded email template reused across the three stages. */
function templateEmail(opts: {
  greeting: string;
  body: string[];
  bullets: Array<{ label: string; href: string; sub: string }>;
  closing: string;
}): string {
  const body = opts.body.map((p) => `<p style="font-size:14px;line-height:1.55;color:#334155;margin:0 0 14px;">${p}</p>`).join("");
  const bullets = opts.bullets
    .map(
      (b) =>
        `<li style="margin:0 0 12px;padding-left:0;list-style:none;">
           <a href="${SITE_URL}${b.href}" style="font-weight:700;color:#0f172a;text-decoration:none;font-size:14px;">${b.label} →</a>
           <div style="font-size:12px;color:#64748b;margin-top:2px;">${b.sub}</div>
         </li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
      <p style="font-size:13px;color:#64748b;margin:0 0 8px;">invest.com.au</p>
      <p style="font-size:14px;color:#0f172a;margin:0 0 14px;">${opts.greeting}</p>
      ${body}
      <ul style="margin:16px 0;padding:0;">${bullets}</ul>
      <p style="font-size:13px;color:#334155;margin:16px 0 0;">${opts.closing}</p>
      <p style="font-size:11px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:14px;">
        Don't want these? <a href="${SITE_URL}/api/unsubscribe?email=recipient" style="color:#94a3b8;">Unsubscribe</a>.
        General information only — not personal financial advice.
      </p>
    </div>
  </body>
</html>`;
}
