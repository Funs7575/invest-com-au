"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";
import type { BrokerScreenshot } from "@/lib/types";

interface BrokerScreenshotGalleryProps {
  /** Active screenshots — caller must only render when length > 0. */
  screenshots: BrokerScreenshot[];
  /** Broker display name, used to compose descriptive alt/aria text. */
  brokerName: string;
}

/**
 * Accessible app-screenshot gallery for the broker detail page.
 *
 * Renders a responsive thumbnail strip; activating a thumbnail opens a
 * modal lightbox. The lightbox supports full keyboard control:
 *   - ArrowLeft / ArrowRight cycle between screenshots
 *   - Home / End jump to the first / last
 *   - Escape closes and returns focus to the thumbnail that opened it
 *   - Tab is trapped within the dialog
 * Every image carries meaningful alt text derived from its caption (falling
 * back to a positional label) so screen-reader users get equivalent context.
 * Thumbnails lazy-load; the active lightbox image loads eagerly.
 */
export default function BrokerScreenshotGallery({
  screenshots,
  brokerName,
}: BrokerScreenshotGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Remember the thumbnail that opened the lightbox so focus can return there.
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const count = screenshots.length;
  const isOpen = openIndex !== null;

  const altFor = useCallback(
    (shot: BrokerScreenshot, index: number) =>
      shot.caption?.trim()
        ? shot.caption
        : `${brokerName} platform screenshot ${index + 1} of ${count}`,
    [brokerName, count],
  );

  const close = useCallback(() => {
    const returnTo = openIndex;
    setOpenIndex(null);
    // Restore focus to the originating thumbnail after the dialog unmounts.
    if (returnTo !== null) {
      setTimeout(() => triggerRefs.current[returnTo]?.focus(), 0);
    }
  }, [openIndex]);

  const showRelative = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        return (current + delta + count) % count;
      });
    },
    [count],
  );

  // Keyboard handling + focus trap while the lightbox is open.
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        showRelative(1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        showRelative(-1);
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setOpenIndex(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setOpenIndex(count - 1);
        return;
      }
      // Focus trap: cycle Tab within the dialog.
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, close, showRelative, count]);

  // Lock body scroll + move focus into the dialog when it opens.
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const firstBtn = dialogRef.current?.querySelector<HTMLElement>("button");
      firstBtn?.focus();
    }, 50);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [isOpen]);

  if (count === 0) return null;

  const active = openIndex !== null ? screenshots[openIndex] : null;

  return (
    <section
      aria-labelledby="broker-screenshots-heading"
      className="container-custom max-w-4xl mt-8 md:mt-12"
    >
      <h2
        id="broker-screenshots-heading"
        className="text-lg md:text-xl font-extrabold text-slate-900 mb-1"
      >
        {brokerName} app screenshots
      </h2>
      <p className="text-xs md:text-sm text-slate-600 mb-4">
        A look at the {brokerName} platform. Select a screenshot to view it
        larger.
      </p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {screenshots.map((shot, i) => (
          <li key={`${shot.url}-${i}`}>
            <button
              type="button"
              ref={(el) => {
                triggerRefs.current[i] = el;
              }}
              onClick={() => setOpenIndex(i)}
              className="group relative block w-full aspect-[9/16] sm:aspect-[3/4] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              aria-haspopup="dialog"
            >
              <Image
                src={shot.url}
                alt={altFor(shot, i)}
                fill
                loading="lazy"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white opacity-0 transition-opacity group-hover:bg-slate-900/30 group-hover:opacity-100"
              >
                <Icon name="external-link" size={20} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {active && openIndex !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${brokerName} screenshot ${openIndex + 1} of ${count}`}
            className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col"
          >
            <div className="flex items-center justify-between gap-3 text-white">
              <p className="text-sm font-medium" aria-live="polite">
                {openIndex + 1} / {count}
              </p>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close screenshot viewer"
              >
                <Icon name="x-circle" size={28} />
              </button>
            </div>

            <div className="relative mt-2 flex flex-1 items-center justify-center">
              {count > 1 && (
                <button
                  type="button"
                  onClick={() => showRelative(-1)}
                  className="absolute left-0 z-10 -translate-x-1 rounded-full bg-white/90 p-2 text-slate-900 shadow hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 md:-translate-x-12"
                  aria-label="Previous screenshot"
                >
                  <Icon name="chevron-left" size={24} />
                </button>
              )}

              <figure className="m-0 max-h-[80vh] overflow-hidden rounded-lg bg-white/5">
                <Image
                  key={active.url}
                  src={active.url}
                  alt={altFor(active, openIndex)}
                  width={active.width ?? 1080}
                  height={active.height ?? 1920}
                  priority
                  sizes="(max-width: 768px) 90vw, 768px"
                  className="max-h-[80vh] w-auto object-contain"
                />
                {active.caption?.trim() && (
                  <figcaption className="bg-black/60 px-3 py-2 text-center text-sm text-white">
                    {active.caption}
                  </figcaption>
                )}
              </figure>

              {count > 1 && (
                <button
                  type="button"
                  onClick={() => showRelative(1)}
                  className="absolute right-0 z-10 translate-x-1 rounded-full bg-white/90 p-2 text-slate-900 shadow hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 md:translate-x-12"
                  aria-label="Next screenshot"
                >
                  <Icon name="chevron-right" size={24} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
