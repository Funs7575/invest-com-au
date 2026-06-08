import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPlansForUser } from "@/lib/getmatched/action-plans";
import { listForUser as listSavedSearches } from "@/lib/saved-searches";
import {
  buildDecisionInbox,
  type DecisionItem,
  type DecisionKind,
  type BadgeTone,
  type GoalDbRow,
  type RateMemoryRow,
} from "@/lib/decision-inbox";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Decision Inbox — My Account",
  robots: "noindex, nofollow",
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchInboxData(userId: string, email: string | null) {
  const supabase = await createClient();

  const [goals, plans, searches, rateMemoryResult] = await Promise.all([
    supabase
      .from("investor_goals")
      .select(
        "id, label, goal_type, target_cents, target_date, current_balance_cents, monthly_contribution_cents, expected_return_pct",
      )
      .order("target_date", { ascending: true }),

    listPlansForUser(userId),

    listSavedSearches(userId),

    // Rate memory joined with broker name — admin client not needed since
    // user_rate_memory has per-user RLS via auth.uid()
    supabase
      .from("user_rate_memory")
      .select("id, broker_id, product_kind, last_seen_rate_bps, notified_rate_bps, notified_at, last_seen_at, brokers(name, slug)")
      .eq("user_id", userId),
  ]);

  void email; // reserved for future use

  const goalRows: GoalDbRow[] = (goals.data ?? []).map((r) => ({
    id: r.id as number,
    label: r.label as string,
    goal_type: r.goal_type as string,
    target_cents: Number(r.target_cents),
    target_date: r.target_date as string,
    current_balance_cents: Number(r.current_balance_cents),
    monthly_contribution_cents: Number(r.monthly_contribution_cents),
    expected_return_pct: Number(r.expected_return_pct),
  }));

  const rateMemoryRows: RateMemoryRow[] = (rateMemoryResult.data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => ({
      id: r.id as string,
      broker_id: r.broker_id as number,
      broker_name: r.brokers?.name ?? "Unknown",
      broker_slug: r.brokers?.slug ?? "",
      product_kind: r.product_kind as string,
      last_seen_rate_bps: r.last_seen_rate_bps as number,
      notified_rate_bps: r.notified_rate_bps as number | null,
      notified_at: r.notified_at as string | null,
      last_seen_at: r.last_seen_at as string,
    }),
  );

  return { goalRows, plans, searches, rateMemoryRows };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DecisionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/account/decisions");

  const { goalRows, plans, searches, rateMemoryRows } = await fetchInboxData(
    user.id,
    user.email ?? null,
  );

  const items = buildDecisionInbox(goalRows, plans, searches, rateMemoryRows);

  const highCount = items.filter((i) => i.urgency === "high").length;
  const totalCount = items.length;

  return (
    <div style={{ background: "var(--color-ink-50)", minHeight: "100vh", paddingTop: 40, paddingBottom: 72 }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 24 }}>
          <Link href="/account" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>
            My Account
          </Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <span style={{ color: "var(--color-ink-600)" }}>Decision inbox</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "var(--color-ink-900)", margin: 0 }}>
              Decision inbox
            </h1>
            {totalCount > 0 && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  background: highCount > 0 ? "#fef3c7" : "#f1f5f9",
                  color: highCount > 0 ? "#92400e" : "#475569",
                  border: `1px solid ${highCount > 0 ? "#fde68a" : "#e2e8f0"}`,
                  borderRadius: 20,
                  padding: "2px 10px",
                }}
              >
                {totalCount} open {totalCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: "var(--color-ink-500)", marginTop: 6 }}>
            Goals, plans, briefs, and alerts across your account — in one place.
          </p>
        </div>

        {/* Items or empty state */}
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((item) => (
              <InboxCard key={item.key} item={item} />
            ))}
          </div>
        )}

        {/* Compliance footer */}
        <p style={{ fontSize: 11, color: "var(--color-ink-400)", lineHeight: 1.6, marginTop: 32 }}>
          {GENERAL_ADVICE_WARNING} Projections and urgency indicators are
          arithmetic summaries of your own stored data — not financial advice.
        </p>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function InboxCard({ item }: { item: DecisionItem }) {
  const urgencyBar = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#94a3b8",
  }[item.urgency];

  return (
    <Link
      href={item.href}
      style={{
        display: "block",
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: "16px 20px 16px 24px",
        textDecoration: "none",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.15s",
      }}
    >
      {/* Urgency accent bar */}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: urgencyBar,
          borderRadius: "14px 0 0 14px",
          display: "block",
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        {/* Left: icon + content */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
          <KindIcon kind={item.kind} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 2, lineHeight: 1.3 }}>
              {item.title}
            </p>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: item.nextAction ? 6 : 0 }}>
              {item.subtitle}
            </p>
            {item.nextAction && (
              <p style={{ fontSize: 12, color: "#0f172a", fontStyle: "italic", display: "flex", alignItems: "flex-start", gap: 4 }}>
                <span style={{ color: "#94a3b8", flexShrink: 0 }}>→</span>
                {item.nextAction}
              </p>
            )}
          </div>
        </div>

        {/* Right: badge + due label */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <BadgeChip text={item.badge} tone={item.badgeTone} />
          {item.dueLabel && (
            <p style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
              {item.dueLabel}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Kind icon ────────────────────────────────────────────────────────────────

const KIND_CONFIG: Record<DecisionKind, { emoji: string; bg: string }> = {
  goal:        { emoji: "🎯", bg: "#eff6ff" },
  plan:        { emoji: "📋", bg: "#fefce8" },
  brief:       { emoji: "📨", bg: "#fff7ed" },
  saved_search: { emoji: "🔔", bg: "#f0fdf4" },
  rate_alert:  { emoji: "📊", bg: "#fef3c7" },
};

function KindIcon({ kind }: { kind: DecisionKind }) {
  const { emoji, bg } = KIND_CONFIG[kind];
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        flexShrink: 0,
      }}
    >
      {emoji}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<BadgeTone, { bg: string; color: string; border: string }> = {
  red:   { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
  amber: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  green: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  blue:  { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  slate: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

function BadgeChip({ text, tone }: { text: string; tone: BadgeTone }) {
  const s = BADGE_STYLES[tone];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: "2px 8px",
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {text}
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: "48px 32px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
        All clear
      </h2>
      <p style={{ fontSize: 14, color: "#64748b", maxWidth: 360, margin: "0 auto 24px", lineHeight: 1.6 }}>
        No open decisions right now. Set a goal, build an action plan, or save a
        search alert and it&apos;ll show up here.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href="/account/goals"
          style={{
            padding: "9px 20px",
            background: "#0f172a",
            color: "white",
            fontWeight: 700,
            fontSize: 13,
            borderRadius: 9,
            textDecoration: "none",
          }}
        >
          Set a goal →
        </Link>
        <Link
          href="/get-matched"
          style={{
            padding: "9px 20px",
            background: "#f1f5f9",
            color: "#0f172a",
            fontWeight: 700,
            fontSize: 13,
            borderRadius: 9,
            textDecoration: "none",
          }}
        >
          Build an action plan →
        </Link>
      </div>
    </div>
  );
}
