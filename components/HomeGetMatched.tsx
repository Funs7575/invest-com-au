import Link from "next/link";
import Icon from "@/components/Icon";
import { DesignIcon } from "@/components/design/DesignIcon";
import { HOMEPAGE_GOAL_CHIPS } from "@/lib/getmatched/embeds";
import { intentCountryMeta } from "@/lib/intent-context";
import { getIntentCountry } from "@/lib/intent-context-server";
import ResumeBanner from "@/components/get-matched/ResumeBanner";
import { SHOW_MATCH_LANGUAGE } from "@/lib/compliance-config";

// Single consolidated "Get matched" band.
//
// Replaces the previous top-of-page triple-up (the GetMatchedEmbed goal-chip
// grid + the HomePathfinder 3-step + the advisor HomeHowItWorks block), which
// repeated the same "answer a few questions → we route you" funnel four times
// before the fold. The primary path now lives once at the top (hero CTA + the
// four route cards, whose featured card *is* get-matched); this band is the
// single catch-all further down for visitors who browsed the platforms and
// opportunities and still want to be routed.
//
// In country mode the CTA carries the country slug forward as ?country=<slug>
// so the quiz prefills the international track (the quiz wires the prefill).
// Copy stays global — the CountryPopularLinks strip already calls out the
// active country explicitly, so repeating it here would clash.
export default async function HomeGetMatched() {
  const code = await getIntentCountry();
  const quizHref = code ? `/quiz?country=${intentCountryMeta(code).slug}` : "/quiz";

  const steps = [
    ["1", "Answer a few prompts", "What you're trying to do, your situation, your timeframe."],
    ["2", "We route you", "Comparison, listing, expert directory or matched enquiry — whatever fits."],
    ["3", "You decide", "Always your call. We don't recommend personal investments."],
  ] as const;

  return (
    <section style={{ padding: "28px 36px", maxWidth: 1280, margin: "0 auto" }}>
      <div className="home-getmatched-resume" style={{ marginBottom: 16 }}>
        <ResumeBanner />
      </div>

      <div
        className="bg-white border border-slate-200 home-getmatched-card"
        style={{
          borderRadius: 18,
          padding: "24px 24px 20px",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 36,
          alignItems: "center",
        }}
      >
        {/* Left — the pitch + primary CTA */}
        <div>
          <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
            ● {SHOW_MATCH_LANGUAGE ? "Get matched" : "60-second quiz"} · no email needed
          </span>
          <h2
            className="font-display"
            style={{
              fontSize: 30,
              letterSpacing: "-.028em",
              fontWeight: 800,
              margin: "6px 0 8px",
              lineHeight: 1.08,
              color: "var(--color-ink-900)",
              textWrap: "balance",
            }}
          >
            Still deciding? {SHOW_MATCH_LANGUAGE ? "Get matched in 60 seconds." : "Answer 4 quick questions."}
          </h2>
          <p
            style={{
              fontSize: 14.5,
              color: "var(--color-ink-600)",
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 540,
            }}
          >
            Answer a few quick questions and we&apos;ll point you to the single best next step
            &mdash; a platform to compare, an opportunity to browse, an expert to contact, or a
            guide to read.
          </p>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "16px 0 22px",
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              fontSize: 12.5,
              color: "var(--color-ink-500)",
            }}
          >
            {["No email needed", "Skip anytime", "Clear next step"].map((t) => (
              <li key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span
                  aria-hidden
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 99,
                    background: "var(--color-emerald-600)",
                    display: "inline-block",
                  }}
                />
                {t}
              </li>
            ))}
          </ul>

          <Link
            href={quizHref}
            className="iv2-cta"
            style={{ fontSize: 14.5, padding: "13px 24px", borderRadius: 11 }}
          >
            {SHOW_MATCH_LANGUAGE ? "Get matched in 60 seconds" : "Take the 60-second quiz"}{" "}
            <DesignIcon name="arrow-right" size={14} strokeWidth={2.6} />
          </Link>
        </div>

        {/* Right — how it works (3 steps, with the compliance line) */}
        <ol
          className="home-getmatched-steps"
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {steps.map(([n, title, sub]) => (
            <li
              key={n}
              className="bg-slate-50 border border-slate-200"
              style={{
                borderRadius: 12,
                padding: "13px 15px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <span
                aria-hidden
                className="font-mono"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 99,
                  background: "var(--color-coral-100)",
                  color: "var(--color-coral-700)",
                  fontWeight: 800,
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {n}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink-900)" }}>
                  {title}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--color-ink-500)",
                    marginTop: 2,
                    lineHeight: 1.45,
                  }}
                >
                  {sub}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Granular goal short-cuts — preserved from the old goal-chip grid, but
          demoted to a single quiet row so they no longer compete with the
          primary route cards above the fold. Each deep-links into the flow
          with the goal pre-selected. */}
      <div
        className="home-getmatched-goals"
        style={{
          marginTop: 16,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--color-ink-500)",
            letterSpacing: ".02em",
            marginRight: 2,
          }}
        >
          Or jump straight to a goal:
        </span>
        {HOMEPAGE_GOAL_CHIPS.map((chip) => {
          const q = new URLSearchParams();
          q.set("goal", chip.value);
          q.set("context", "homepage");
          return (
            <Link
              key={chip.value}
              href={`/get-matched?${q.toString()}`}
              className="group bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 11px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-ink-700)",
                textDecoration: "none",
                transition: "border-color .15s, background-color .15s",
              }}
            >
              <Icon
                name={chip.icon}
                size={13}
                className="text-slate-500 group-hover:text-amber-600 shrink-0"
              />
              {chip.label}
            </Link>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .home-getmatched-card {
            grid-template-columns: 1fr !important;
            gap: 22px !important;
          }
        }
        @media (max-width: 640px) {
          .home-getmatched-goals {
            flex-wrap: nowrap !important;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
            padding-bottom: 4px;
          }
          .home-getmatched-goals::-webkit-scrollbar { display: none; }
          .home-getmatched-goals > * { flex-shrink: 0; }
        }
      `}</style>
    </section>
  );
}
