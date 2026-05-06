"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

interface PanelDef {
  key: string;
  eyebrow: string;
  accent: string;
  href: string;
  ariaLabel: string;
}

type PanelKey = "compare" | "browse" | "find" | "matched" | "tools";

const AUTO_ROTATE_MS = 2800;

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
        eyebrow: "Compare platforms",
        accent: "rgba(96,165,250,1)",
        href: "/compare",
        ariaLabel: "Compare investing platforms",
      },
      {
        key: "browse",
        eyebrow: "Browse opportunities",
        accent: "rgba(52,211,153,1)",
        href: "/invest",
        ariaLabel: "Browse Australian investments for sale",
      },
      {
        key: "find",
        eyebrow: "Find an expert",
        accent: "rgba(167,139,250,1)",
        href: "/advisors",
        ariaLabel: "Find a verified Australian expert",
      },
      {
        key: "matched",
        eyebrow: "Get matched",
        accent: "var(--color-coral-400)",
        href: "/quiz",
        ariaLabel: "Get matched with a 4-question quiz",
      },
      {
        key: "tools",
        eyebrow: "Tools & data",
        accent: "rgba(251,191,36,1)",
        href: "/calculators",
        ariaLabel: "Use calculators and data tools",
      },
    ],
    [],
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
        {/* glow halo */}
        <div aria-hidden className="hero-reel-glow" />

        {/* header strip — pokie chrome label */}
        <div className="hero-reel-chrome">
          <span className="hero-reel-label font-mono">Ways to use Invest.com.au</span>
        </div>

        {/* vertical segmented progress bar follows the reel direction */}
        <nav className="hero-reel-pips" aria-label="Vertical reel position">
          {panels.map((p, i) => (
            <button
              key={p.key}
              type="button"
              onClick={() => showPanel(i)}
              aria-current={i === active ? "true" : undefined}
              aria-label={`Show ${p.eyebrow}`}
              title={`Show ${p.eyebrow}`}
              className={`hero-reel-pip ${i === active ? "is-active" : ""}`}
              style={i === active ? { background: p.accent } : undefined}
            />
          ))}
        </nav>

        {/* viewport — panels roll top-to-bottom like a pokie reel */}
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
                <PanelInner
                  panelKey={p.key as PanelKey}
                  accent={p.accent}
                  eyebrow={p.eyebrow}
                  brokers={brokers}
                  listings={listings}
                  advisors={advisors}
                  brokerCount={brokerCount}
                  listingCount={listingCount}
                  advisorCount={advisorCount}
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
          border: 1px solid rgba(255,255,255,.18);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          box-shadow: 0 28px 60px -24px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06);
          overflow: hidden;
        }
        .hero-reel-glow {
          position: absolute;
          inset: -40px;
          background: radial-gradient(circle at 70% 50%, rgba(242,88,34,.22), transparent 65%);
          pointer-events: none;
          z-index: 0;
        }
        .hero-reel-chrome {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
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
        .hero-reel-pips {
          position: absolute;
          top: 62px;
          right: 14px;
          bottom: 22px;
          z-index: 4;
          display: grid;
          grid-template-rows: repeat(5, minmax(0, 1fr));
          gap: 7px;
          width: 5px;
        }
        .hero-reel-pip {
          width: 5px;
          min-height: 24px;
          border-radius: 99px;
          background: rgba(255,255,255,.18);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: background-color .2s ease, transform .2s ease, width .2s ease;
        }
        .hero-reel-pip:hover { background: rgba(255,255,255,.32); }
        .hero-reel-pip.is-active {
          width: 7px;
          transform: translateX(-1px);
        }
        .hero-reel-viewport {
          position: relative;
          height: 320px;
          overflow: hidden;
          z-index: 1;
        }
        .hero-reel-viewport::before,
        .hero-reel-viewport::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 34px;
          z-index: 3;
          pointer-events: none;
        }
        .hero-reel-viewport::before {
          top: 0;
          background: linear-gradient(180deg, rgba(13,17,23,.58), transparent);
        }
        .hero-reel-viewport::after {
          bottom: 0;
          background: linear-gradient(0deg, rgba(13,17,23,.58), transparent);
        }
        .hero-reel-panel {
          position: absolute;
          inset: 0;
          padding: 18px 38px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          color: rgba(255,255,255,.92);
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
        .panel-head {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .panel-icon {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.12);
          flex-shrink: 0;
        }
        .panel-eyebrow {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .panel-title {
          margin: 3px 0 0;
          font-size: 21px;
          line-height: 1.08;
          font-weight: 850;
          letter-spacing: -.035em;
          color: white;
        }
        .panel-copy {
          margin: -2px 0 0;
          max-width: 330px;
          font-size: 12.5px;
          line-height: 1.45;
          color: rgba(255,255,255,.68);
        }
        .panel-insight {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.10);
        }
        .panel-insight-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: rgba(255,255,255,.5);
        }
        .panel-insight-value {
          font-size: 14px;
          font-weight: 800;
          color: white;
        }
        .panel-checklist {
          display: grid;
          gap: 7px;
        }
        .panel-checklist span {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,.78);
        }
        .panel-checklist span::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 99px;
          background: currentColor;
          opacity: .75;
          flex-shrink: 0;
        }
        .panel-cta {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: .03em;
          text-transform: uppercase;
          color: rgba(255,255,255,.85);
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

        /* Compare panel */
        .compare-list {
          display: grid;
          gap: 7px;
        }
        .compare-row {
          display: grid;
          grid-template-columns: 8px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.10);
          font-size: 12px;
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
          font-size: 11px;
          color: rgba(96,165,250,1);
          font-weight: 800;
        }

        /* Browse panel */
        .browse-grid {
          display: grid;
          grid-template-columns: 1.15fr .85fr;
          gap: 8px;
          min-height: 92px;
        }
        .browse-stack {
          display: grid;
          gap: 8px;
        }
        .browse-tile {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.10);
          min-height: 92px;
        }
        .browse-tile-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,.35);
          font-size: 14px;
          font-weight: 700;
        }
        .browse-tile-title {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 5px 7px;
          background: linear-gradient(180deg, transparent, rgba(0,0,0,.78));
          color: white;
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1.15;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        /* Find panel */
        .find-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 14px;
          padding: 12px;
          border-radius: 13px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.10);
        }
        .find-avatars {
          display: inline-flex;
        }
        .find-avatar {
          position: relative;
          width: 42px;
          height: 42px;
          border-radius: 99px;
          overflow: hidden;
          border: 2px solid rgba(13,17,23,.85);
          margin-left: -8px;
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
          font-size: 13px;
          font-weight: 800;
        }
        .find-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .find-count {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -.02em;
          color: white;
        }
        .find-label {
          font-size: 11.5px;
          color: rgba(255,255,255,.65);
        }

        /* Matched panel */
        .matched-flow {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          align-items: stretch;
        }
        .matched-progress {
          display: grid;
          grid-template-rows: repeat(4, 1fr);
          gap: 5px;
          width: 6px;
          padding: 2px 0;
        }
        .matched-progress .step {
          border-radius: 99px;
          background: var(--color-coral-400);
        }
        .matched-card {
          padding: 12px 14px;
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
          font-size: 18px;
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

        /* Tools panel */
        .tools-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .tools-tile {
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.10);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .tools-tile .tile-label {
          font-size: 10.5px;
          font-weight: 700;
          color: rgba(255,255,255,.62);
          text-transform: uppercase;
          letter-spacing: .04em;
        }
        .tools-tile .tile-value {
          font-size: 16px;
          font-weight: 800;
          color: white;
          letter-spacing: -.01em;
          font-family: var(--font-mono, ui-monospace, monospace);
        }
      `}</style>
    </div>
  );
}

function PanelInner({
  panelKey,
  accent,
  eyebrow,
  brokers,
  listings,
  advisors,
  brokerCount,
  listingCount,
  advisorCount,
  matchBroker,
}: {
  panelKey: PanelKey;
  accent: string;
  eyebrow: string;
  brokers: ReadonlyArray<ReelBroker>;
  listings: ReadonlyArray<ReelListing>;
  advisors: ReadonlyArray<ReelAdvisor>;
  brokerCount: number;
  listingCount: number;
  advisorCount: number;
  matchBroker: ReelBroker | undefined;
}) {
  const panelMeta = {
    compare: {
      icon: "trending-up",
      title: "Pick a platform",
      copy: "Compare fees and features before you open an account.",
      cta: `${brokerCount.toLocaleString("en-AU")} platforms`,
    },
    browse: {
      icon: "briefcase",
      title: "Browse investments",
      copy: "Scan live opportunities and jump into the ones that fit your brief.",
      cta: `${listingCount.toLocaleString("en-AU")} live`,
    },
    find: {
      icon: "users",
      title: "Find an expert",
      copy: "Shortlist verified specialists for tax, SMSF, property and advice questions.",
      cta: `${advisorCount.toLocaleString("en-AU")} verified`,
    },
    matched: {
      icon: "compass",
      title: "Get routed fast",
      copy: "Answer four simple prompts and we point you to the clearest next step.",
      cta: "60 seconds · no email",
    },
    tools: {
      icon: "calculator",
      title: "Use tools & data",
      copy: "Run quick calculators and sanity-check costs before you decide.",
      cta: "14 tools",
    },
  } as const;
  const meta = panelMeta[panelKey];

  return (
    <>
      <div className="panel-head">
        <span className="panel-icon" style={{ color: accent }} aria-hidden>
          <DesignIcon name={meta.icon} size={18} strokeWidth={2.3} />
        </span>
        <div>
          <div className="panel-eyebrow font-mono" style={{ color: accent }}>
            {eyebrow}
          </div>
          <h3 className="panel-title">{meta.title}</h3>
        </div>
      </div>
      <p className="panel-copy">{meta.copy}</p>

      {panelKey === "compare" && <ComparePanel brokers={brokers} accent={accent} />}
      {panelKey === "browse" && <BrowsePanel listings={listings} />}
      {panelKey === "find" && <FindPanel advisors={advisors} count={advisorCount} />}
      {panelKey === "matched" && <MatchedPanel matchBroker={matchBroker} />}
      {panelKey === "tools" && <ToolsPanel />}

      <div className="panel-cta">
        <span>{meta.cta}</span>
        <span className="panel-cta-arrow" aria-hidden>
          <DesignIcon name="arrow-right" size={13} strokeWidth={2.6} />
        </span>
      </div>
    </>
  );
}

function ComparePanel({ brokers, accent }: { brokers: ReadonlyArray<ReelBroker>; accent: string }) {
  const rows = brokers.slice(0, 3);
  const placeholder: ReelBroker[] = [
    { name: "CMC Markets", asx_fee: "$11" },
    { name: "Stake", asx_fee: "$3" },
    { name: "Pearler", asx_fee: "$6.50" },
  ];
  const display = rows.length >= 3 ? rows : placeholder;
  return (
    <div className="compare-list">
      <div className="panel-insight">
        <span className="panel-insight-label font-mono">Start with</span>
        <span className="panel-insight-value">Fees + markets</span>
      </div>
      {display.slice(0, 2).map((b, i) => (
        <div key={`${b.name}-${i}`} className="compare-row">
          <span
            className="dot"
            aria-hidden
            style={{ background: b.color || accent }}
          />
          <span className="name">{b.name}</span>
          <span className="fee">{b.asx_fee || "—"}</span>
        </div>
      ))}
    </div>
  );
}

function BrowsePanel({ listings }: { listings: ReadonlyArray<ReelListing> }) {
  const tiles = listings.slice(0, 3);
  const placeholder: ReelListing[] = [
    { id: "p1", title: "Cattle station, NT", image: null },
    { id: "p2", title: "Cafe chain, VIC", image: null },
    { id: "p3", title: "Solar farm, QLD", image: null },
  ];
  const display = tiles.length >= 3 ? tiles : placeholder;
  return (
    <div className="browse-grid">
      <div className="browse-tile">
        {display[0]?.image ? (
          <Image
            src={display[0].image}
            alt=""
            fill
            sizes="(min-width: 1024px) 180px, 45vw"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <span className="browse-tile-fallback" aria-hidden>
            <DesignIcon name="map-pin" size={22} strokeWidth={2.2} />
          </span>
        )}
        <span className="browse-tile-title">{display[0]?.title}</span>
      </div>
      <div className="browse-stack panel-checklist">
        <span>Location</span>
        <span>Price range</span>
        <span>Due diligence</span>
      </div>
    </div>
  );
}

function FindPanel({
  advisors,
  count,
}: {
  advisors: ReadonlyArray<ReelAdvisor>;
  count: number;
}) {
  const items = advisors.filter((a) => a.photo_url).slice(0, 4);
  const fallback: ReelAdvisor[] = [
    { name: "Olivia P", photo_url: null },
    { name: "Jamal K", photo_url: null },
    { name: "Mei S", photo_url: null },
    { name: "Tom R", photo_url: null },
  ];
  const display = items.length >= 3 ? items : fallback;
  return (
    <div className="find-row">
      <div className="find-avatars">
        {display.map((a, i) => (
          <div key={`${a.name}-${i}`} className="find-avatar">
            {a.photo_url ? (
              <Image
                src={a.photo_url}
                alt=""
                fill
                sizes="42px"
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
      <div className="find-meta">
        <span className="find-count">{count.toLocaleString("en-AU")}+</span>
        <span className="find-label">Verified Australian specialists</span>
        <span className="find-label">Filter by goal, location and expertise</span>
      </div>
    </div>
  );
}

function MatchedPanel({ matchBroker }: { matchBroker: ReelBroker | undefined }) {
  return (
    <div className="matched-flow">
      <div className="matched-progress" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="step" />
        ))}
      </div>
      <div className="matched-card">
        <div className="matched-eyebrow font-mono">Simple flow</div>
        <div className="matched-name">4 questions → next step</div>
        <div className="matched-fee">
          Example: {matchBroker?.name || "CMC Markets"} · {matchBroker?.asx_fee || "$11"} ASX
        </div>
      </div>
    </div>
  );
}

function ToolsPanel() {
  const tiles = [
    { label: "Compare costs", value: "Fees" },
    { label: "Estimate tax", value: "CGT" },
    { label: "Check FX", value: "Rates" },
    { label: "Plan switch", value: "$" },
  ];
  return (
    <div className="tools-grid">
      {tiles.map((t) => (
        <div key={t.label} className="tools-tile">
          <span className="tile-label">{t.label}</span>
          <span className="tile-value">{t.value}</span>
        </div>
      ))}
    </div>
  );
}
