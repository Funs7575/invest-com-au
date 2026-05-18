"use client";

import { useState } from "react";
import Image from "next/image";

export interface PlatformScreenshot {
  /** Public URL — the Supabase storage public bucket or an external CDN. */
  url: string;
  /** Short label shown under the thumbnail ("Mobile trade", "Fees page"). */
  label: string;
  /** Longer caption for accessibility + alt text. */
  caption: string;
}

interface Props {
  platformName: string;
  shots: PlatformScreenshot[];
  className?: string;
}

// FIN_NOTEBOOK item 12 — platform screenshot gallery.
//
// Pre-launch surface for the "actual product UX" moat vs Canstar/Finder.
// 3–5 real screenshots (login, trade, portfolio, fees, mobile) per
// platform. Today this component renders from a prop-passed array; the
// data source is the caller (typically a static array on broker/[slug]
// or a future `brokers.screenshots jsonb` migration).
//
// Migration not yet shipped — adding `screenshots jsonb` to `brokers`
// + an admin upload form is a separate follow-up. Until then this is
// callable with a hand-curated list per page, or skipped entirely.
//
// Schema.org ImageObject markup is rendered alongside so search engines
// can index the gallery images (driving image-search discovery).
export default function PlatformScreenshotGallery({
  platformName,
  shots,
  className = "",
}: Props) {
  const [active, setActive] = useState(0);

  if (shots.length === 0) return null;
  const current = shots[active] ?? shots[0];
  if (!current) return null;

  return (
    <figure
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${className}`}
      aria-label={`${platformName} platform screenshots`}
    >
      <div className="relative w-full aspect-[16/10] bg-slate-100">
        <Image
          src={current.url}
          alt={current.caption}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 720px"
        />
      </div>
      <figcaption className="px-4 py-3 text-sm text-slate-700 border-t border-slate-100">
        {current.caption}
      </figcaption>
      {shots.length > 1 && (
        <div
          className="px-3 pb-3 flex gap-2 overflow-x-auto"
          role="tablist"
          aria-label={`${platformName} screenshot picker`}
        >
          {shots.map((s, i) => (
            <button
              key={s.url}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`relative w-20 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                i === active ? "border-emerald-500" : "border-slate-200 hover:border-slate-400"
              }`}
            >
              <Image
                src={s.url}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
              />
              <span className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[10px] font-semibold px-1 py-0.5 truncate">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Schema.org ImageObject for each shot — helps image-search
          discoverability. JSON-LD inline so the component is drop-in. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            shots.map((s) => ({
              "@context": "https://schema.org",
              "@type": "ImageObject",
              contentUrl: s.url,
              description: s.caption,
              name: `${platformName} — ${s.label}`,
            })),
          ),
        }}
      />
    </figure>
  );
}
