"use client";

/**
 * FY Money Wrapped — swipeable card deck.
 *
 * One stat per card. Navigation: touch swipe, ArrowLeft/ArrowRight (plus
 * Home/End), and always-visible previous/next buttons. The enter animation
 * is a small fade-and-rise gated behind Tailwind's `motion-reduce:` variant
 * AND the global prefers-reduced-motion CSS, so reduced-motion users get an
 * instant swap. Card changes are announced via a polite live region.
 *
 * The finale card carries the share / download / "set up FY+1" actions.
 * Personal numbers are only ever fetched through the authenticated
 * /api/account/wrapped-card endpoint — nothing identifying in any URL.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ConfettiBurst from "@/components/delight/ConfettiBurst";
import type { WrappedCard, WrappedTone } from "@/lib/wrapped";

const TONE_CLASSES: Record<WrappedTone, string> = {
  violet: "bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-900",
  emerald: "bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900",
  amber: "bg-gradient-to-br from-amber-500 via-orange-600 to-rose-700",
  sky: "bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-900",
  rose: "bg-gradient-to-br from-rose-500 via-rose-600 to-fuchsia-900",
  slate: "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950",
};

const SWIPE_THRESHOLD_PX = 48;

interface NextFyCta {
  href: string;
  label: string;
  desc: string;
}

const NEXT_FY_CTAS: NextFyCta[] = [
  { href: "/account/goals", label: "Set a goal", desc: "Give the new year a target" },
  { href: "/account/health", label: "Run your health check", desc: "Fresh score, fresh baseline" },
  { href: "/find-advisor", label: "Find an adviser", desc: "Get matched in minutes" },
];

interface WrappedDeckProps {
  cards: WrappedCard[];
  fyLabel: string;
  shareUrl: string;
  shareSummary: string;
  /** Show share/download on the finale (false when there's nothing to share yet). */
  canShare: boolean;
}

export default function WrappedDeck({
  cards,
  fyLabel,
  shareUrl,
  shareSummary,
  canShare,
}: WrappedDeckProps) {
  const [index, setIndex] = useState(0);
  const [entered, setEntered] = useState(true);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const total = cards.length;
  const card = cards[index];

  const goTo = useCallback(
    (next: number) => {
      setIndex((current) => {
        const clamped = Math.max(0, Math.min(total - 1, next));
        return clamped === current ? current : clamped;
      });
    },
    [total],
  );

  // Re-run the enter transition on card change. The synchronous reset to the
  // pre-enter frame is the whole point — we paint opacity-0/translate-y-3,
  // then a double-rAF flips it back so the CSS transition fires. Visual-only,
  // and a no-op for reduced-motion users via the motion-reduce classes below.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset to the "before" frame so the enter transition re-triggers on card change.
    setEntered(false);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [index]);

  // One-shot confetti latch when the finale is first reached.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot latch: derive-on-render can't express "fire once when the finale is first seen".
    if (index === total - 1) setReachedEnd(true);
  }, [index, total]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(total - 1);
      }
    },
    [goTo, index, total],
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const startX = touchStartX.current;
      touchStartX.current = null;
      const endX = e.changedTouches[0]?.clientX;
      if (startX === null || endX === undefined) return;
      const delta = endX - startX;
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
      goTo(delta < 0 ? index + 1 : index - 1);
    },
    [goTo, index],
  );

  const handleShare = useCallback(async () => {
    const text = `My ${fyLabel} Money Wrapped: ${shareSummary}`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: `${fyLabel} Money Wrapped`, text, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(`${text} — ${shareUrl}`);
      setShareStatus("Copied to clipboard");
    } catch {
      // User dismissed the share sheet, or clipboard was refused — no noise.
      setShareStatus(null);
    }
  }, [fyLabel, shareSummary, shareUrl]);

  if (!card) return null;

  const isFinale = card.key === "finale";

  return (
    <section aria-label={`${fyLabel} Money Wrapped cards`}>
      {/* Focusable region per the WAI-ARIA carousel pattern — arrow keys navigate */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`${fyLabel} Money Wrapped`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 rounded-[28px]"
      >
        <div
          role="group"
          aria-roledescription="slide"
          aria-label={`Card ${index + 1} of ${total}`}
          className={`relative overflow-hidden rounded-[28px] p-7 sm:p-10 text-white shadow-xl min-h-[440px] sm:min-h-[480px] flex flex-col ${TONE_CLASSES[card.tone]} ${
            entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          } transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0`}
        >
          {isFinale && reachedEnd && canShare && <ConfettiBurst />}

          {/* Counter */}
          <p className="text-xs font-semibold tracking-widest text-white/60 tnum">
            {index + 1} / {total}
          </p>

          <div className="flex-1 flex flex-col justify-center py-6">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-white/80">
              {card.kicker}
            </p>
            <h2 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05] tnum [text-wrap:balance]">
              {card.headline}
            </h2>
            <p className="mt-4 max-w-md text-[15px] sm:text-base leading-relaxed text-white/90">
              {card.body}
            </p>

            {!isFinale && card.cta && (
              <Link
                href={card.cta.href}
                className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-colors"
              >
                {card.cta.label}
                <span aria-hidden>→</span>
              </Link>
            )}

            {isFinale && (
              <div className="mt-7">
                {canShare && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:outline-none transition-colors"
                    >
                      Share my Wrapped
                    </button>
                    <a
                      href="/api/account/wrapped-card"
                      download={`${fyLabel.toLowerCase()}-money-wrapped.png`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-colors"
                    >
                      Download my card
                    </a>
                    {shareStatus && (
                      <span role="status" className="text-xs font-medium text-white/80">
                        {shareStatus}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-6 grid gap-2">
                  {NEXT_FY_CTAS.map((cta) => (
                    <Link
                      key={cta.href}
                      href={cta.href}
                      className="group flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition-colors"
                    >
                      <span>
                        <span className="block text-sm font-bold text-white">{cta.label}</span>
                        <span className="block text-xs text-white/70">{cta.desc}</span>
                      </span>
                      <span aria-hidden className="text-white/70 group-hover:text-white">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-white/50">
            Built from your own saved data · invest.com.au
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous card"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-violet-400 hover:text-violet-700 disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none transition-colors"
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5" aria-hidden>
          {cards.map((c, i) => (
            <button
              key={c.key}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all motion-reduce:transition-none ${
                i === index ? "w-5 bg-violet-600" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === total - 1}
          aria-label="Next card"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:border-violet-400 hover:text-violet-700 disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none transition-colors"
        >
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Screen-reader announcement of card changes */}
      <p className="sr-only" aria-live="polite">
        Card {index + 1} of {total}: {card.kicker}. {card.headline}
      </p>
    </section>
  );
}
