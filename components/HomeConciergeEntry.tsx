"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";
import { trackEvent } from "@/lib/tracking";

/**
 * Promotes the AI Investment Concierge to the homepage. Submits the
 * typed question into sessionStorage and navigates to `/concierge`,
 * which auto-fires the prompt on mount.
 *
 * Free text is intentionally NOT passed through the URL — the
 * `/concierge` page already validates `?finder=<key>` against an
 * allowlist. sessionStorage keeps the value same-origin and avoids
 * a tampered-URL vector.
 */

const SEED_KEY = "ic_concierge_pending_prompt_v1";
const MAX_PROMPT_LEN = 200;

const STARTERS = [
  { label: "Find me a broker for SMSF with $500k", finder: null as string | null },
  { label: "Compare CommSec vs Stake for US shares", finder: null },
  { label: "Choosing a financial advisor", finder: "advisor-finder" as const },
  { label: "ETFs for beginners", finder: "first-etf" as const },
];

function sanitisePrompt(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_PROMPT_LEN);
}

export default function HomeConciergeEntry() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !submitting, [input, submitting]);

  const launch = useCallback(
    (prompt: string, source: "input" | "chip", finder?: string | null) => {
      const clean = sanitisePrompt(prompt);
      if (!clean) return;
      setSubmitting(true);
      try {
        sessionStorage.setItem(SEED_KEY, clean);
      } catch {
        // sessionStorage blocked — fall back to navigating without seed
      }
      trackEvent("concierge_homepage_entry_submit", {
        source,
        prompt_length: clean.length,
        finder: finder ?? null,
      });
      const href = finder ? `/concierge?finder=${encodeURIComponent(finder)}` : "/concierge";
      router.push(href);
    },
    [router],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    launch(input, "input");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      launch(input, "input");
    }
  };

  return (
    <section
      aria-labelledby="home-concierge-entry-heading"
      style={{
        background: "linear-gradient(180deg, var(--color-ink-900) 0%, #0d1726 100%)",
        color: "white",
        padding: "32px 36px 40px",
        borderTop: "1px solid rgba(255,255,255,.06)",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            className="iv2-pill"
            style={{
              background: "rgba(242,88,34,.14)",
              color: "var(--color-coral-400)",
              border: "1px solid rgba(242,88,34,.32)",
              fontSize: 11,
              padding: "4px 11px",
            }}
          >
            <span aria-hidden>✦</span> AI concierge · free
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.55)" }}>
            Grounded in {`Invest.com.au`} brokers, advisors, ETFs & guides — not personal advice.
          </span>
        </div>

        <h2
          id="home-concierge-entry-heading"
          className="font-display"
          style={{
            fontSize: "clamp(22px, 2.6vw, 30px)",
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-.02em",
            lineHeight: 1.2,
            textWrap: "balance",
          }}
        >
          Ask the concierge — get answers grounded in real listings.
        </h2>

        <form
          onSubmit={onSubmit}
          data-testid="home-concierge-entry-form"
          style={{ position: "relative" }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_PROMPT_LEN))}
            onKeyDown={onKeyDown}
            placeholder="Ask about brokers, ETFs, SMSF, FIRB, advisors, foreign-investor rules…"
            aria-label="Ask the investment concierge"
            rows={2}
            maxLength={MAX_PROMPT_LEN}
            disabled={submitting}
            style={{
              width: "100%",
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.18)",
              borderRadius: 14,
              padding: "14px 110px 14px 16px",
              fontSize: 15,
              color: "white",
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            type="submit"
            disabled={!canSend}
            data-testid="home-concierge-entry-submit"
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              background: canSend
                ? "linear-gradient(180deg, var(--color-coral-400), var(--color-coral-500))"
                : "rgba(255,255,255,.18)",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              padding: "9px 16px",
              borderRadius: 10,
              border: "none",
              cursor: canSend ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Ask <DesignIcon name="arrow-right" size={12} strokeWidth={2.6} />
          </button>
        </form>

        <div
          role="list"
          aria-label="Concierge starter prompts"
          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
        >
          {STARTERS.map((s) => (
            <button
              key={s.label}
              type="button"
              role="listitem"
              onClick={() => launch(s.label, "chip", s.finder)}
              data-testid="home-concierge-entry-chip"
              style={{
                background: "rgba(255,255,255,.04)",
                color: "rgba(255,255,255,.85)",
                border: "1px solid rgba(255,255,255,.14)",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            fontSize: 11.5,
            color: "rgba(255,255,255,.55)",
            alignItems: "center",
          }}
        >
          <Link href="/concierge" style={{ color: "rgba(255,255,255,.85)", textDecoration: "underline" }}>
            Open full concierge →
          </Link>
          <span aria-hidden>·</span>
          <span>Educational only. Always seek personal advice from a licensed AFSL adviser.</span>
        </div>
      </div>
    </section>
  );
}
