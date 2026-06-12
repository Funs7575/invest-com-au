"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatDollars,
  type ReviewModel,
  type ReviewSection,
  type NetWorthSection,
  type GoalsSection,
  type RatesSection,
  type DecisionsSection,
} from "@/lib/monthly-review";
import type { ReviewHistoryEntry } from "@/lib/monthly-review-data";
import { periodLabel } from "@/lib/monthly-review";

interface Props {
  model: ReviewModel;
  history: ReviewHistoryEntry[];
}

type Phase = "intro" | "section" | "done";

export default function ReviewFlowClient({ model, history }: Props) {
  const sections = model.sections;
  const [phase, setPhase] = useState<Phase>(
    model.alreadyCompleted ? "done" : "intro",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedStreak, setCompletedStreak] = useState<number | null>(
    model.alreadyCompleted ? model.streak : null,
  );

  const total = sections.length;
  const current = sections[stepIndex];

  async function complete() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/monthly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: model.period }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { streak?: number };
      setCompletedStreak(typeof data.streak === "number" ? data.streak : model.streak);
      setPhase("done");
    } catch {
      // Fail soft: still show the completion screen so the user isn't blocked,
      // but surface a gentle note that saving didn't go through.
      setError(
        "We couldn't save this review just now — your progress wasn't recorded. Please try again later.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (stepIndex + 1 < total) {
      setStepIndex((i) => i + 1);
    } else {
      void complete();
    }
  }

  function back() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else setPhase("intro");
  }

  // ── Intro ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <section aria-labelledby="review-intro-heading">
        <Header period={model.periodLabel} streak={completedStreak} />
        <div style={cardStyle}>
          <h1
            id="review-intro-heading"
            style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 8px" }}
          >
            Your {model.periodLabel} money review
          </h1>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: "0 0 16px" }}>
            {model.isBaseline
              ? "This is your first review — we'll capture a baseline of where things stand. Each month from now, you'll see what changed."
              : "A quick walk through what's moved since your last review: your net worth, goals, rates, and open decisions."}
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 20px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {sections.map((s) => (
              <li
                key={s.key}
                style={{
                  fontSize: 13,
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span aria-hidden="true">{SECTION_EMOJI[s.key]}</span>
                {s.headline}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setPhase("section")} style={primaryBtn}>
            Start review · about {Math.max(2, total * 2)} min
          </button>
        </div>
        <PastReviews history={history} />
      </section>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <section aria-labelledby="review-done-heading">
        <Header period={model.periodLabel} streak={completedStreak} />
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }} aria-hidden="true">
            ✅
          </div>
          <h1
            id="review-done-heading"
            style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 8px" }}
          >
            {model.periodLabel} review complete
          </h1>
          {completedStreak !== null && completedStreak > 0 && (
            <p
              style={{
                display: "inline-block",
                fontSize: 13,
                fontWeight: 800,
                color: "#92400e",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 20,
                padding: "4px 14px",
                margin: "0 0 14px",
              }}
            >
              🔥 {completedStreak}-month streak
            </p>
          )}
          <p
            style={{
              fontSize: 14,
              color: "#475569",
              lineHeight: 1.6,
              maxWidth: 380,
              margin: "0 auto 20px",
            }}
          >
            Nice work. We&apos;ve saved a snapshot of where you stand — next
            month&apos;s review will show what changed.
          </p>
          {error && <ErrorNote message={error} />}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/account/dashboard" style={primaryLink}>
              Back to dashboard
            </Link>
            <Link href="/account/decisions" style={secondaryLink}>
              Open decision inbox
            </Link>
          </div>
        </div>
        <PastReviews history={history} highlightPeriod={model.period} />
      </section>
    );
  }

  // ── Section walkthrough ──────────────────────────────────────────────────
  if (!current) {
    // No sections at all (shouldn't happen — net_worth/goals/decisions always
    // present) — let the user finish gracefully.
    return (
      <section>
        <Header period={model.periodLabel} streak={completedStreak} />
        <div style={cardStyle}>
          <p style={{ fontSize: 14, color: "#475569" }}>
            Nothing to review this month yet.
          </p>
          <button type="button" onClick={() => void complete()} style={primaryBtn} disabled={submitting}>
            {submitting ? "Saving…" : "Mark review done"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="review-step-heading">
      <Header period={model.periodLabel} streak={completedStreak} />

      {/* Progress */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#94a3b8",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          <span>
            Step {stepIndex + 1} of {total}
          </span>
          <span>{current.headline}</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={stepIndex + 1}
          aria-label="Review progress"
          style={{ height: 6, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}
        >
          <div
            style={{
              height: "100%",
              width: `${((stepIndex + 1) / total) * 100}%`,
              background: "#7c3aed",
              borderRadius: 999,
              transition: "width 0.4s ease",
            }}
            className="mr-progress-fill"
          />
        </div>
      </div>

      {/* Section card — aria-live so screen readers announce each step */}
      <div style={cardStyle} aria-live="polite">
        <div style={{ fontSize: 34, marginBottom: 8 }} aria-hidden="true">
          {SECTION_EMOJI[current.key]}
        </div>
        <h1
          id="review-step-heading"
          style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}
        >
          {current.headline}
        </h1>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: "0 0 16px" }}>
          {current.detail}
        </p>

        <SectionBody section={current} />

        {/* Nudge action */}
        <Link href={current.nudge.href} style={nudgeLink}>
          {current.nudge.label}
          <span aria-hidden="true" style={{ marginLeft: 6 }}>
            →
          </span>
        </Link>

        {error && <ErrorNote message={error} />}

        {/* Nav */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
            gap: 12,
          }}
        >
          <button type="button" onClick={back} style={ghostBtn} disabled={submitting}>
            Back
          </button>
          <button type="button" onClick={next} style={primaryBtn} disabled={submitting}>
            {stepIndex + 1 < total
              ? "Next"
              : submitting
                ? "Saving…"
                : "Finish review"}
          </button>
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .mr-progress-fill { transition: none !important; }
        }
      `}</style>
    </section>
  );
}

// ─── Section bodies ────────────────────────────────────────────────────────────

function SectionBody({ section }: { section: ReviewSection }) {
  switch (section.key) {
    case "net_worth":
      return <NetWorthBody section={section} />;
    case "goals":
      return <GoalsBody section={section} />;
    case "rates":
      return <RatesBody section={section} />;
    case "decisions":
      return <DecisionsBody section={section} />;
    default:
      return null;
  }
}

function NetWorthBody({ section }: { section: NetWorthSection }) {
  return (
    <div style={statBox}>
      <p style={statLabel}>Total net worth</p>
      <p style={statValue}>{formatDollars(section.totalCents)}</p>
      {section.deltaCents !== null && section.deltaCents !== 0 && (
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: section.deltaCents > 0 ? "#166534" : "#475569",
            margin: "2px 0 0",
          }}
        >
          {section.deltaCents > 0 ? "▲" : "▼"} {formatDollars(Math.abs(section.deltaCents))}{" "}
          since last review
        </p>
      )}
    </div>
  );
}

function GoalsBody({ section }: { section: GoalsSection }) {
  if (section.goals.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 4 }}>
      {section.goals.map((g) => (
        <div key={g.id} style={statBox}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>
              {g.label}
            </p>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                padding: "2px 8px",
                borderRadius: 20,
                background: g.onTrack ? "#f0fdf4" : "#fffbeb",
                color: g.onTrack ? "#166534" : "#92400e",
                border: `1px solid ${g.onTrack ? "#bbf7d0" : "#fde68a"}`,
              }}
            >
              {g.onTrack ? "On track" : "Behind"}
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: "#e2e8f0",
              borderRadius: 999,
              overflow: "hidden",
              margin: "8px 0 4px",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, g.progressPct)}%`,
                background: g.onTrack ? "#10b981" : "#f59e0b",
                borderRadius: 999,
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
            {g.progressPct}% projected
            {g.deltaPct !== null && g.deltaPct !== 0 && (
              <span style={{ color: g.deltaPct > 0 ? "#166534" : "#b45309", fontWeight: 700 }}>
                {" "}
                ({g.deltaPct > 0 ? "+" : ""}
                {g.deltaPct} pts since last review)
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

function RatesBody({ section }: { section: RatesSection }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
      {section.changed.map((r, i) => (
        <div key={`${r.brokerSlug}-${i}`} style={statBox}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>
            {r.brokerName} {r.productKind === "td" ? "term deposit" : "savings"}
          </p>
          <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
            <span style={{ textDecoration: "line-through", color: "#94a3b8" }}>{r.fromPct}%</span>{" "}
            <span aria-hidden="true">→</span> <strong>{r.currentPct}%</strong>
          </p>
        </div>
      ))}
    </div>
  );
}

function DecisionsBody({ section }: { section: DecisionsSection }) {
  return (
    <div style={statBox}>
      <p style={statLabel}>Open decisions</p>
      <p style={statValue}>{section.openCount}</p>
    </div>
  );
}

// ─── Shared bits ───────────────────────────────────────────────────────────────

function Header({ period, streak }: { period: string; streak: number | null }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        gap: 12,
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Monthly review · {period}
      </p>
      {streak !== null && streak > 0 && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#92400e",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 20,
            padding: "2px 10px",
            whiteSpace: "nowrap",
          }}
        >
          🔥 {streak} mo
        </span>
      )}
    </div>
  );
}

function PastReviews({
  history,
  highlightPeriod,
}: {
  history: ReviewHistoryEntry[];
  highlightPeriod?: string;
}) {
  if (history.length === 0) return null;
  return (
    <section aria-labelledby="past-reviews-heading" style={{ marginTop: 28 }}>
      <h2
        id="past-reviews-heading"
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#94a3b8",
          margin: "0 0 10px",
        }}
      >
        Your past reviews
      </h2>
      <div
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {history.map((h, i) => (
          <div
            key={h.period}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
              background: h.period === highlightPeriod ? "#f5f3ff" : "white",
            }}
          >
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                {periodLabel(h.period)}
              </p>
              {h.completedAt && (
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                  Completed{" "}
                  {new Date(h.completedAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              {h.netWorthCents !== null && (
                <p style={{ fontSize: 13, fontWeight: 700, color: "#334155", margin: 0 }}>
                  {formatDollars(h.netWorthCents)}
                </p>
              )}
              {h.healthOverall !== null && (
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                  Health {h.healthOverall}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p
      role="alert"
      style={{
        fontSize: 12,
        color: "#991b1b",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 8,
        padding: "8px 12px",
        margin: "14px 0 0",
        lineHeight: 1.5,
      }}
    >
      {message}
    </p>
  );
}

// ─── Style tokens ──────────────────────────────────────────────────────────────

const SECTION_EMOJI: Record<ReviewSection["key"], string> = {
  net_worth: "💰",
  goals: "🎯",
  rates: "📊",
  decisions: "📨",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: "24px",
};

const statBox: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "14px 16px",
  marginBottom: 14,
};

const statLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#94a3b8",
  margin: "0 0 2px",
};

const statValue: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: "#0f172a",
  margin: 0,
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 22px",
  background: "#0f172a",
  color: "white",
  fontWeight: 700,
  fontSize: 14,
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "11px 18px",
  background: "transparent",
  color: "#64748b",
  fontWeight: 600,
  fontSize: 14,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  cursor: "pointer",
};

const primaryLink: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 22px",
  background: "#0f172a",
  color: "white",
  fontWeight: 700,
  fontSize: 13,
  borderRadius: 9,
  textDecoration: "none",
};

const secondaryLink: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 22px",
  background: "#f1f5f9",
  color: "#0f172a",
  fontWeight: 700,
  fontSize: 13,
  borderRadius: 9,
  textDecoration: "none",
};

const nudgeLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: 13,
  fontWeight: 700,
  color: "#7c3aed",
  textDecoration: "none",
};
