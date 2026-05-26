"use client";

import { useState } from "react";
import Image from "next/image";

interface Screenshot {
  url: string;
  label?: string | null;
}

interface AppScreenshotGalleryProps {
  screenshots: Screenshot[];
  brokerName: string;
}

export default function AppScreenshotGallery({ screenshots, brokerName }: AppScreenshotGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (screenshots.length === 0) return null;

  const prev = () =>
    setLightboxIndex((i) => (i != null ? (i - 1 + screenshots.length) % screenshots.length : null));
  const next = () =>
    setLightboxIndex((i) => (i != null ? (i + 1) % screenshots.length : null));

  return (
    <div className="mb-6 md:mb-8">
      <h2 className="text-base md:text-lg font-extrabold text-slate-900 mb-3">
        {brokerName} Platform Screenshots
      </h2>
      {/* Horizontal scroll strip */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0"
        role="list"
        aria-label={`${brokerName} app screenshots`}
      >
        {screenshots.map((shot, i) => (
          <button
            key={i}
            type="button"
            role="listitem"
            aria-label={shot.label ? shot.label : `${brokerName} screenshot ${i + 1} of ${screenshots.length}`}
            onClick={() => setLightboxIndex(i)}
            className="shrink-0 snap-start rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-slate-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            style={{ width: "140px" }}
          >
            <div className="relative" style={{ width: "140px", height: "248px" }}>
              <Image
                src={shot.url}
                alt={shot.label ?? `${brokerName} app screenshot ${i + 1}`}
                fill
                className="object-cover"
                sizes="140px"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
            {shot.label && (
              <p className="text-[0.6rem] text-slate-500 text-center px-1 py-1.5 leading-snug bg-white">
                {shot.label}
              </p>
            )}
          </button>
        ))}
      </div>
      <p className="text-[0.65rem] text-slate-400 mt-2">
        Tap a screenshot to enlarge. Images provided by {brokerName}.
      </p>

      {/* Lightbox */}
      {lightboxIndex != null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${brokerName} screenshot lightbox`}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxIndex(null);
            if (e.key === "ArrowLeft") { e.stopPropagation(); prev(); }
            if (e.key === "ArrowRight") { e.stopPropagation(); next(); }
          }}
        >
          <div
            className="relative max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden">
              <Image
                src={screenshots[lightboxIndex]!.url}
                alt={screenshots[lightboxIndex]?.label ?? `${brokerName} screenshot ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 90vw, 384px"
              />
            </div>
            {screenshots[lightboxIndex]?.label && (
              <p className="text-center text-sm text-white mt-3 font-medium">
                {screenshots[lightboxIndex]?.label}
              </p>
            )}
            <p className="text-center text-xs text-slate-400 mt-1">
              {lightboxIndex + 1} / {screenshots.length}
            </p>
          </div>

          {screenshots.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous screenshot"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors text-lg font-bold"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Next screenshot"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors text-lg font-bold"
              >
                ›
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close screenshot lightbox"
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors text-xl"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
