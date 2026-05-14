"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

export interface ReelBroker {
  name: string;
  asx_fee: string | null;
  color?: string | null;
}

export interface ReelListing {
  id: number | string;
  title: string;
  image: string | null;
}

export interface ReelAdvisor {
  name: string;
  photo_url: string | null;
}

interface Props {
  brokers: ReadonlyArray<ReelBroker>;
  listings: ReadonlyArray<ReelListing>;
  advisors: ReadonlyArray<ReelAdvisor>;
  brokerCount: number;
  listingCount: number;
  advisorCount: number;
}

interface IntentPanelDef {
  key: string;
  eyebrow: string;
  question: string;
  suggestedStep: string;
  proof: string;
  href: string;
  ctaLabel: string;
  accent: string;
  ariaLabel: string;
  icon: string;
  chips: ReadonlyArray<string>;
}

const AUTO_ROTATE_MS = 3200;

export default function HomeHeroReel({
  brokerCount,
  listingCount,
  advisorCount,
}: Props) {
  const panels: ReadonlyArray<IntentPanelDef> = useMemo(
    () => [
      {
        key: "new-investor",
        eyebrow: "New investor",
        question: "I’m new to investing — where should I start?",
        suggestedStep: "Answer 4 questions and get a clear starting point",
        proof: "60 seconds · no email",
        href: "/quiz",
        ctaLabel: "Get matched",
        accent: "var(--color-coral-400)",
        ariaLabel: "Get matched if you are new to investing",
        icon: "sparkles",
        chips: ["Beginner", "ETF", "Super"],
      },
      {
        key: "broker-fees",
        eyebrow: "Broker fees",
        question: "Which broker is cheapest for monthly ETF investing?",
        suggestedStep: "Compare fees, markets and platform features",
        proof: `${brokerCount.toLocaleString("en-AU")} platforms tracked`,
        href: "/compare",
        ctaLabel: "Compare platforms",
        accent: "rgba(96,165,250,1)",
        ariaLabel: "Compare platforms for monthly ETF investing",
        icon: "trending-down",
        chips: ["ASX", "ETFs", "FX fees"],
      },
      {
        key: "switch-platforms",
        eyebrow: "Switching platforms",
        question: "Could I save money by switching investing platforms?",
        suggestedStep: "Estimate trading, FX and account costs before moving",
        proof: "Fees · FX · break-even",
        href: "/tools/should-i-switch",
        ctaLabel: "Check switching costs",
        accent: "rgba(251,191,36,1)",
        ariaLabel: "Check whether switching investing platforms could save money",
        icon: "calculator",
        chips: ["Costs", "Tools", "Brokers"],
      },
      {
        key: "opportunities",
        eyebrow: "Beyond listed shares",
        question: "What Australian investments are currently for sale?",
        suggestedStep: "Browse businesses, property, farmland and private markets",
        proof: `${listingCount.toLocaleString("en-AU")} live opportunities`,
        href: "/invest",
        ctaLabel: "Browse opportunities",
        accent: "rgba(52,211,153,1)",
        ariaLabel: "Browse Australian investments currently for sale",
        icon: "map-pin",
        chips: ["Businesses", "Farmland", "Property"],
      },
      {
        key: "expert-help",
        eyebrow: "Expert help",
        question: "Do I need a financial adviser, accountant or broker?",
        suggestedStep: "Find a specialist by need, location and credentials",
        proof: `${advisorCount.toLocaleString("en-AU")} verified specialists`,
        href: "/advisors",
        ctaLabel: "Find an expert",
        accent: "rgba(167,139,250,1)",
        ariaLabel: "Find a verified Australian expert",
        icon: "users",
        chips: ["Adviser", "Tax", "Mortgage"],
      },
      {
        key: "smsf",
        eyebrow: "SMSF",
        question: "Should I set up an SMSF or get help with one?",
        suggestedStep: "See SMSF guides, calculators and specialist support",
        proof: "Set-up · strategy · compliance",
        href: "/invest/smsf",
        ctaLabel: "Explore SMSFs",
        accent: "rgba(45,212,191,1)",
        ariaLabel: "Explore SMSF investing and support",
        icon: "briefcase",
        chips: ["SMSF", "Property", "Retirement"],
      },
      {
        key: "property-investor",
        eyebrow: "Property investor",
        question: "I want to buy an investment property — who should I speak to first?",
        suggestedStep: "Compare buyer’s agents, brokers and property research paths",
        proof: "Finance · suburbs · specialists",
        href: "/property",
        ctaLabel: "Start property research",
        accent: "rgba(248,113,113,1)",
        ariaLabel: "Start investment property research",
        icon: "home",
        chips: ["Property", "Finance", "Buyer’s agents"],
      },
      {
        key: "tax",
        eyebrow: "Tax & CGT",
        question: "What tax do I pay when I sell shares, crypto or property?",
        suggestedStep: "Use calculators and find tax specialists when it gets complex",
        proof: "CGT · dividends · non-resident tax",
        href: "/calculators",
        ctaLabel: "Use tax tools",
        accent: "rgba(250,204,21,1)",
        ariaLabel: "Use investing tax calculators and tools",
        icon: "calculator",
        chips: ["CGT", "Dividends", "Crypto"],
      },
    ],
    [advisorCount, brokerCount, listingCount],
  );

  const [active, setActive] = useState(0);
  const [exiting, setExiting] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const showPanel = useCallback(
    (next: number | ((current: number) => number)) => {
      const resolved = typeof next === "function" ? next(active) : next;
      if (resolved === active) return;

      setExiting(active);
      setActive(resolved);
    },
    [active],
  );

  useEffect(() => {
    if (exiting === null) return;
    const id = window.setTimeout(() => setExiting(null), 520);
    return () => window.clearTimeout(id);
  }, [exiting]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      showPanel((a) => (a + 1) % panels.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, panels.length, showPanel]);

  return (
    <div
      className="hero-reel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Investor intent questions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero-reel-frame">
        <div aria-hidden className="hero-reel-glow" />

        <div className="hero-reel-chrome">
          <span className="hero-reel-label font-mono">What are you trying to do?</span>
          <nav className="hero-reel-pips" aria-label="Question reel position">
            {panels.map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => showPanel(i)}
                aria-current={i === active ? "true" : undefined}
                aria-label={`Show question: ${p.question}`}
                className={`hero-reel-pip ${i === active ? "is-active" : ""}`}
                style={i === active ? { background: p.accent } : undefined}
              />
            ))}
          </nav>
        </div>

        <div className="hero-reel-viewport" aria-live="polite">
          {panels.map((p, i) => {
            const isActive = i === active;
            return (
              <Link
                key={p.key}
                href={p.href}
                aria-label={p.ariaLabel}
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                className={`hero-reel-panel ${isActive ? "is-active" : ""} ${exiting === i ? "is-exiting" : ""}`}
              >
                <IntentPanel panel={p} />
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        .hero-reel {
          position: relative;
          width: 100%;
          max-width: 460px;
          justify-self: end;
        }
        .hero-reel-frame {
          position: relative;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(25,32,48,.82));
          border: 1px solid rgba(255,255,255,.16);
          box-shadow: 0 24px 80px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.10);
          overflow: hidden;
          min-height: 290px;
        }
        .hero-reel-frame::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 74% 44%, rgba(242,88,34,.22), transparent 42%),
            radial-gradient(circle at 14% 14%, rgba(167,139,250,.16), transparent 30%);
          pointer-events: none;
        }
        .hero-reel-glow {
          position: absolute;
          inset: -44px;
          background: radial-gradient(circle at 70% 52%, rgba(242,88,34,.24), transparent 62%);
          pointer-events: none;
          z-index: 0;
        }
        .hero-reel-chrome {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 9px;
          padding: 12px 18px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.035);
        }
        .hero-reel-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .09em;
          color: rgba(255,255,255,.58);
        }
        .hero-reel-pips {
          display: grid;
          grid-template-columns: repeat(8, minmax(0, 1fr));
          gap: 5px;
          width: 100%;
        }
        .hero-reel-pip {
          width: 100%;
          height: 4px;
          border-radius: 99px;
          background: rgba(255,255,255,.17);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: background-color .2s ease, transform .2s ease;
        }
        .hero-reel-pip:hover { background: rgba(255,255,255,.34); }
        .hero-reel-pip.is-active { transform: scaleY(1.65); }
        .hero-reel-viewport {
          position: relative;
          height: 300px;
          overflow: hidden;
          z-index: 1;
        }
        .hero-reel-viewport::before,
        .hero-reel-viewport::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 28px;
          z-index: 3;
          pointer-events: none;
        }
        .hero-reel-viewport::before {
          top: 0;
          background: linear-gradient(180deg, rgba(11,18,32,.74), transparent);
        }
        .hero-reel-viewport::after {
          bottom: 0;
          background: linear-gradient(0deg, rgba(11,18,32,.74), transparent);
        }
        .hero-reel-panel {
          position: absolute;
          inset: 0;
          padding: 24px 24px 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          color: rgba(255,255,255,.93);
          text-decoration: none;
          opacity: 0;
          transform: translateY(-112%);
          pointer-events: none;
          transition: opacity .3s cubic-bezier(.2,.8,.2,1),
                      transform .52s cubic-bezier(.16,1,.3,1);
          will-change: transform, opacity;
        }
        .hero-reel-panel.is-active {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .hero-reel-panel.is-exiting {
          opacity: 0;
          transform: translateY(112%);
          pointer-events: none;
        }
        .hero-reel-panel:hover .panel-cta-arrow,
        .hero-reel-panel:focus-visible .panel-cta-arrow {
          transform: translateX(3px);
          background: rgba(255,255,255,.18);
        }
        .intent-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .intent-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .intent-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 99px;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
        }
        .intent-question {
          max-width: 360px;
          font-size: clamp(23px, 3.1vw, 31px);
          line-height: 1.04;
          letter-spacing: -.045em;
          font-weight: 850;
          text-wrap: balance;
          color: white;
        }
        .intent-question-mark {
          color: var(--intent-accent);
        }
        .intent-next-step {
          margin-top: 2px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,.075);
          border: 1px solid rgba(255,255,255,.12);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
        }
        .intent-next-label {
          display: block;
          margin-bottom: 4px;
          font-size: 9.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .09em;
          color: var(--intent-accent);
        }
        .intent-next-copy {
          display: block;
          font-size: 13px;
          line-height: 1.36;
          color: rgba(255,255,255,.78);
        }
        .intent-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .intent-chip {
          font-size: 10px;
          line-height: 1;
          font-weight: 800;
          color: rgba(255,255,255,.78);
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 99px;
          padding: 6px 8px;
        }
        .panel-cta {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 11.5px;
          font-weight: 850;
          letter-spacing: .03em;
          text-transform: uppercase;
          color: rgba(255,255,255,.88);
        }
        .panel-proof {
          color: rgba(255,255,255,.58);
        }
        .panel-cta-main {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .panel-cta-arrow {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 99px;
          background: rgba(255,255,255,.10);
          color: white;
          transition: transform .18s ease, background-color .18s ease;
        }
        @media (max-width: 1023px) {
          .hero-reel { max-width: 560px; justify-self: stretch; }
        }
        @media (max-width: 640px) {
          .hero-reel-frame { min-height: 310px; }
          .hero-reel-viewport { height: 320px; }
          .hero-reel-panel { padding: 22px 20px; }
          .intent-question { font-size: 26px; }
          .panel-cta { align-items: flex-start; flex-direction: column; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-reel-panel {
            transition: opacity .25s ease !important;
            transform: none !important;
          }
          .hero-reel-panel:hover .panel-cta-arrow,
          .hero-reel-panel:focus-visible .panel-cta-arrow {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}

function IntentPanel({ panel }: { panel: IntentPanelDef }) {
  return (
    <>
      <div className="intent-topline" style={{ "--intent-accent": panel.accent } as CSSProperties}>
        <div className="intent-eyebrow font-mono" style={{ color: panel.accent }}>
          <span className="intent-icon" aria-hidden>
            <DesignIcon name={panel.icon} size={15} strokeWidth={2.4} />
          </span>
          {panel.eyebrow}
        </div>
        <span className="panel-proof font-mono">{panel.proof}</span>
      </div>

      <div className="intent-question font-display">
        “{panel.question.replace(/\?$/, "")}
        <span className="intent-question-mark">?</span>”
      </div>

      <div className="intent-next-step">
        <span className="intent-next-label font-mono">Matched next step</span>
        <span className="intent-next-copy">{panel.suggestedStep}</span>
      </div>

      <div className="intent-chip-row" aria-hidden>
        {panel.chips.map((chip) => (
          <span key={chip} className="intent-chip font-mono">
            {chip}
          </span>
        ))}
      </div>

      <div className="panel-cta">
        <span className="panel-cta-main">
          {panel.ctaLabel}
          <span className="panel-cta-arrow" aria-hidden>
            <DesignIcon name="arrow-right" size={13} strokeWidth={2.6} />
          </span>
        </span>
      </div>
    </>
  );
}
