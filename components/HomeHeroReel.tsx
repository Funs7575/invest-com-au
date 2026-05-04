"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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

type PanelKey = "compare" | "browse" | "find" | "matched" | "tools";

interface PanelDef {
  key: PanelKey;
  headline: string;
  sublabel: string;
  cta: string;
  accent: string;
  href: string;
  ariaLabel: string;
}

export default function HomeHeroReel({
  brokers,
  listings,
  advisors,
  brokerCount,
  listingCount,
  advisorCount,
}: Props) {
  const panels: ReadonlyArray<PanelDef> = useMemo(
    () => [
      {
        key: "compare",
        headline: `Compare ${brokerCount.toLocaleString("en-AU")}+ platforms`,
        sublabel: "Side-by-side fees, FX rates, features",
        cta: "Open compare",
        accent: "rgba(96,165,250,1)",
        href: "/compare",
        ariaLabel: "Compare investing platforms",
      },
      {
        key: "browse",
        headline: `Browse ${listingCount.toLocaleString("en-AU")} opportunities`,
        sublabel: "Real Australian businesses, projects, assets",
        cta: "Browse listings",
        accent: "rgba(52,211,153,1)",
        href: "/invest",
        ariaLabel: "Browse Australian investments for sale",
      },
      {
        key: "find",
        headline: "Find a verified expert",
        sublabel: `${advisorCount.toLocaleString("en-AU")} specialists, by region & fee`,
        cta: "Meet specialists",
        accent: "rgba(167,139,250,1)",
        href: "/advisors",
        ariaLabel: "Find a verified Australian expert",
      },
      {
        key: "matched",
        headline: "Get matched in 60s",
        sublabel: "4 questions · no email · free",
        cta: "Take the quiz",
        accent: "var(--color-coral-400)",
        href: "/quiz",
        ariaLabel: "Get matched with a 4-question quiz",
      },
      {
        key: "tools",
        headline: "See what you'll save",
        sublabel: "Real cost on a sample $10K USD trade",
        cta: "Open calculators",
        accent: "rgba(251,191,36,1)",
        href: "/calculators",
        ariaLabel: "Use calculators and data tools",
      },
    ],
    [brokerCount, listingCount, advisorCount],
  );

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % panels.length);
    }, 3500);
    return () => clearInterval(id);
  }, [paused, panels.length]);

  const matchBroker = brokers[0];

  return (
    <div
      className="hero-reel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Ways to use Invest.com.au"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero-reel-frame">
        <div className="hero-reel-chrome">
          <span className="hero-reel-label font-mono">
            5 ways to use Invest.com.au
          </span>
          <nav className="hero-reel-pips" aria-label="Reel position">
            {panels.map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setActive(i)}
                aria-current={i === active ? "true" : undefined}
                aria-label={`Show ${p.headline}`}
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
                className={`hero-reel-panel ${isActive ? "is-active" : ""}`}
              >
                <PanelInner
                  panel={p}
                  brokers={brokers}
                  listings={listings}
                  advisors={advisors}
                  matchBroker={matchBroker}
                />
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
          background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04));
          border: 1px solid rgba(255,255,255,.16);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 28px 60px -24px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06);
          overflow: hidden;
        }
        .hero-reel-chrome {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-bottom: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.03);
        }
        .hero-reel-label {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .09em;
          color: rgba(255,255,255,.55);
        }
        .hero-reel-pips { display: inline-flex; gap: 6px; }
        .hero-reel-pip {
          width: 26px;
          height: 5px;
          border-radius: 99px;
          background: rgba(255,255,255,.18);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: background-color .2s ease, transform .2s ease;
        }
        .hero-reel-pip:hover { background: rgba(255,255,255,.34); }
        .hero-reel-pip.is-active {
          transform: scaleY(1.3);
          box-shadow: 0 0 0 3px rgba(255,255,255,.04);
        }
        .hero-reel-viewport {
          position: relative;
          height: 320px;
          overflow: hidden;
          z-index: 1;
        }
        .hero-reel-panel {
          position: absolute;
          inset: 0;
          padding: 22px 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          color: rgba(255,255,255,.92);
          text-decoration: none;
          opacity: 0;
          transform: translateY(10px);
          pointer-events: none;
          transition: opacity .35s cubic-bezier(.2,.8,.2,1),
                      transform .42s cubic-bezier(.2,.8,.2,1);
        }
        .hero-reel-panel.is-active {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .hero-reel-panel:hover .panel-cta-pill,
        .hero-reel-panel:focus-visible .panel-cta-pill {
          background: rgba(255,255,255,.14);
          border-color: rgba(255,255,255,.32);
        }
        .hero-reel-panel:hover .panel-cta-pill svg,
        .hero-reel-panel:focus-visible .panel-cta-pill svg {
          transform: translateX(2px);
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-reel-panel {
            transition: opacity .25s ease !important;
            transform: none !important;
          }
          .hero-reel-panel:hover .panel-cta-pill svg,
          .hero-reel-panel:focus-visible .panel-cta-pill svg {
            transform: none;
          }
        }

        .panel-head { display: flex; flex-direction: column; gap: 4px; }
        .panel-head .accent-strip {
          width: 32px;
          height: 3px;
          border-radius: 99px;
          margin-bottom: 8px;
        }
        .panel-headline {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -.015em;
          line-height: 1.15;
          color: white;
        }
        .panel-sublabel {
          font-size: 12.5px;
          color: rgba(255,255,255,.62);
          letter-spacing: .002em;
        }

        .panel-cta-pill {
          margin-top: auto;
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px 7px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.18);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .03em;
          text-transform: uppercase;
          color: white;
          transition: background-color .18s ease, border-color .18s ease;
        }
        .panel-cta-pill svg { transition: transform .18s ease; }

        .compare-rows {
          display: flex;
          flex-direction: column;
          gap: 7px;
          flex: 1;
        }
        .compare-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.10);
          font-size: 13px;
          font-weight: 700;
        }
        .compare-row .dot {
          width: 8px;
          height: 8px;
          border-radius: 99px;
          flex-shrink: 0;
        }
        .compare-row .name {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .compare-row .fee {
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: 12px;
          color: rgba(96,165,250,1);
          font-weight: 800;
        }

        .browse-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          flex: 1;
        }
        .browse-tile {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.10);
        }
        .browse-tile-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,.35);
        }
        .browse-tile-title {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 6px 8px;
          background: linear-gradient(180deg, transparent, rgba(0,0,0,.82));
          color: white;
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1.18;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .find-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }
        .find-avatars { display: inline-flex; }
        .find-avatar {
          position: relative;
          width: 46px;
          height: 46px;
          border-radius: 99px;
          overflow: hidden;
          border: 2px solid rgba(13,17,23,.85);
          margin-left: -10px;
          background: rgba(167,139,250,.22);
        }
        .find-avatar:first-child { margin-left: 0; }
        .find-avatar-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,.65);
          font-size: 14px;
          font-weight: 800;
        }
        .find-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .find-tag {
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 9px;
          border-radius: 99px;
          background: rgba(167,139,250,.14);
          color: rgba(216,205,255,1);
          border: 1px solid rgba(167,139,250,.28);
        }

        .matched-progress { display: flex; gap: 6px; }
        .matched-progress .step {
          flex: 1;
          height: 6px;
          border-radius: 99px;
          background: var(--color-coral-400);
        }
        .matched-card {
          margin-top: 2px;
          padding: 14px 16px;
          border-radius: 12px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
        }
        .matched-eyebrow {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .09em;
          color: rgba(255,255,255,.5);
        }
        .matched-name {
          margin-top: 6px;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -.01em;
          color: white;
        }
        .matched-fee {
          margin-top: 4px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-coral-400);
          font-family: var(--font-mono, ui-monospace, monospace);
        }

        .savings-block {
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1;
        }
        .savings-bars {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .savings-bar-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 700;
        }
        .savings-bar-row .label {
          width: 80px;
          color: rgba(255,255,255,.78);
          flex-shrink: 0;
        }
        .savings-bar-row .track {
          flex: 1;
          height: 12px;
          border-radius: 99px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.10);
          overflow: hidden;
          position: relative;
        }
        .savings-bar-row .fill {
          height: 100%;
          border-radius: 99px;
        }
        .savings-bar-row .cost {
          width: 50px;
          text-align: right;
          font-family: var(--font-mono, ui-monospace, monospace);
          color: white;
        }
        .savings-bar-row.dim .label,
        .savings-bar-row.dim .cost { color: rgba(255,255,255,.55); }
        .savings-bar-row.dim .fill { background: rgba(255,255,255,.22); }
        .savings-bar-row.win .fill { background: var(--color-coral-400); }
        .savings-callout {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          background: rgba(242,88,34,.14);
          border: 1px solid rgba(242,88,34,.32);
        }
        .savings-callout .save-amount {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -.01em;
          color: var(--color-coral-400);
          font-family: var(--font-mono, ui-monospace, monospace);
        }
        .savings-callout .save-context {
          font-size: 11.5px;
          color: rgba(255,255,255,.7);
        }
      `}</style>
    </div>
  );
}

function PanelInner({
  panel,
  brokers,
  listings,
  advisors,
  matchBroker,
}: {
  panel: PanelDef;
  brokers: ReadonlyArray<ReelBroker>;
  listings: ReadonlyArray<ReelListing>;
  advisors: ReadonlyArray<ReelAdvisor>;
  matchBroker: ReelBroker | undefined;
}) {
  return (
    <>
      <div className="panel-head">
        <span
          className="accent-strip"
          aria-hidden
          style={{ background: panel.accent }}
        />
        <div className="panel-headline">{panel.headline}</div>
        <div className="panel-sublabel">{panel.sublabel}</div>
      </div>

      {panel.key === "compare" && <ComparePanel brokers={brokers} accent={panel.accent} />}
      {panel.key === "browse" && <BrowsePanel listings={listings} />}
      {panel.key === "find" && <FindPanel advisors={advisors} />}
      {panel.key === "matched" && <MatchedPanel matchBroker={matchBroker} />}
      {panel.key === "tools" && <SavingsPanel />}

      <span className="panel-cta-pill" aria-hidden>
        {panel.cta}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0-5-5m5 5-5 5" />
        </svg>
      </span>
    </>
  );
}

function ComparePanel({ brokers, accent }: { brokers: ReadonlyArray<ReelBroker>; accent: string }) {
  const placeholder: ReelBroker[] = [
    { name: "Stake", asx_fee: "$3" },
    { name: "Pearler", asx_fee: "$6.50" },
    { name: "CMC Markets", asx_fee: "$11" },
  ];
  const display = brokers.length >= 3 ? brokers.slice(0, 3) : placeholder;
  return (
    <div className="compare-rows">
      {display.map((b, i) => (
        <div key={`${b.name}-${i}`} className="compare-row">
          <span className="dot" aria-hidden style={{ background: b.color || accent }} />
          <span className="name">{b.name}</span>
          <span className="fee">{b.asx_fee || "—"}</span>
        </div>
      ))}
    </div>
  );
}

function BrowsePanel({ listings }: { listings: ReadonlyArray<ReelListing> }) {
  const placeholder: ReelListing[] = [
    { id: "p1", title: "Cattle station, NT", image: null },
    { id: "p2", title: "Cafe chain, VIC", image: null },
    { id: "p3", title: "Solar farm, QLD", image: null },
  ];
  const display = listings.length >= 3 ? listings.slice(0, 3) : placeholder;
  return (
    <div className="browse-grid">
      {display.map((l) => (
        <div key={l.id} className="browse-tile">
          {l.image ? (
            <Image
              src={l.image}
              alt=""
              fill
              sizes="(min-width: 1024px) 130px, 30vw"
              style={{ objectFit: "cover" }}
              unoptimized
            />
          ) : (
            <span className="browse-tile-fallback" aria-hidden>
              <DesignIcon name="map-pin" size={22} strokeWidth={2.2} />
            </span>
          )}
          <span className="browse-tile-title">{l.title}</span>
        </div>
      ))}
    </div>
  );
}

function FindPanel({ advisors }: { advisors: ReadonlyArray<ReelAdvisor> }) {
  const items = advisors.filter((a) => a.photo_url).slice(0, 4);
  const fallback: ReelAdvisor[] = [
    { name: "Olivia P", photo_url: null },
    { name: "Jamal K", photo_url: null },
    { name: "Mei S", photo_url: null },
    { name: "Tom R", photo_url: null },
  ];
  const display = items.length >= 3 ? items : fallback;
  const tags = ["SMSF accountant", "Mortgage broker", "Buyer's agent", "Tax agent", "FIRB"];
  return (
    <div className="find-stack">
      <div className="find-avatars">
        {display.map((a, i) => (
          <div key={`${a.name}-${i}`} className="find-avatar">
            {a.photo_url ? (
              <Image
                src={a.photo_url}
                alt=""
                fill
                sizes="46px"
                style={{ objectFit: "cover" }}
                unoptimized
              />
            ) : (
              <span className="find-avatar-fallback" aria-hidden>
                {a.name.charAt(0)}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="find-tags">
        {tags.map((t) => (
          <span key={t} className="find-tag">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function MatchedPanel({ matchBroker }: { matchBroker: ReelBroker | undefined }) {
  return (
    <>
      <div className="matched-progress" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="step" />
        ))}
      </div>
      <div className="matched-card">
        <div className="matched-eyebrow font-mono">Your best match</div>
        <div className="matched-name">{matchBroker?.name || "CMC Markets"}</div>
        <div className="matched-fee">
          {matchBroker?.asx_fee || "$11"} ASX · 4.9 / 5
        </div>
      </div>
    </>
  );
}

function SavingsPanel() {
  return (
    <div className="savings-block">
      <div className="savings-bars">
        <div className="savings-bar-row dim">
          <span className="label">CommSec</span>
          <span className="track">
            <span className="fill" style={{ width: "100%" }} />
          </span>
          <span className="cost">$87</span>
        </div>
        <div className="savings-bar-row win">
          <span className="label">Stake</span>
          <span className="track">
            <span className="fill" style={{ width: "6%" }} />
          </span>
          <span className="cost">$5</span>
        </div>
      </div>
      <div className="savings-callout">
        <span className="save-amount">$82</span>
        <span className="save-context">saved on a $10K USD trade</span>
      </div>
    </div>
  );
}
