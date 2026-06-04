/**
 * Reusable broker logo/avatar component. Shows the actual logo image
 * if logo_url exists, otherwise falls back to the color+icon pattern.
 */
"use client";

import Image from "next/image";
import { useState } from "react";
import { blurDataURL } from "@/lib/image-blur";

interface BrokerLogoProps {
  broker: {
    name: string;
    slug: string;
    color: string;
    icon?: string;
    logo_url?: string;
  };
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /**
   * Set `true` when the logo is the LCP element of the page (e.g. on
   * `/broker/[slug]` the hero logo). Turns on Next/Image `priority`
   * and drops the `lazy` loading hint so the browser fetches it with
   * the initial HTML. Leave `false` (default) everywhere else to
   * preserve bandwidth.
   */
  priority?: boolean;
}

const SIZES = {
  xs: { container: "w-6 h-6", text: "text-[0.5rem]", img: 24 },
  sm: { container: "w-8 h-8", text: "text-xs", img: 32 },
  md: { container: "w-10 h-10", text: "text-sm", img: 40 },
  lg: { container: "w-12 h-12", text: "text-base", img: 48 },
  xl: { container: "w-16 h-16", text: "text-lg", img: 64 },
};

/**
 * Known sentinel/placeholder logo URLs that exist in some broker data but
 * 404 when routed through the Next image optimizer (e.g. the mirror dataset
 * ships `images.unsplash.com/placeholder`). Match these case-insensitively and
 * substring-wise so query strings or sizing params don't slip past the guard.
 */
const PLACEHOLDER_LOGO_SENTINELS = ["images.unsplash.com/placeholder"];

/**
 * A logo URL is only usable if it's a non-empty string that isn't a known
 * placeholder sentinel. Empty/whitespace/sentinel URLs fall back to the
 * initials avatar up front rather than sending a doomed request through the
 * image optimizer.
 */
function isUsableLogoUrl(url: string | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed === "") return false;
  const lower = trimmed.toLowerCase();
  return !PLACEHOLDER_LOGO_SENTINELS.some((sentinel) => lower.includes(sentinel));
}

function LetterFallback({ broker, s }: { broker: BrokerLogoProps["broker"]; s: (typeof SIZES)["md"] }) {
  return (
    <div
      className={`${s.container} rounded-lg flex items-center justify-center ${s.text} font-bold shrink-0`}
      style={{ background: `${broker.color}20`, color: broker.color }}
    >
      {broker.icon || broker.name.charAt(0)}
    </div>
  );
}

export default function BrokerLogo({
  broker,
  size = "md",
  className = "",
  priority = false,
}: BrokerLogoProps) {
  const s = SIZES[size];
  const [imgError, setImgError] = useState(false);

  if (isUsableLogoUrl(broker.logo_url) && !imgError) {
    const logoUrl = broker.logo_url.trim();
    const isIco = logoUrl.endsWith(".ico");

    // ICO files: use native <img> since Next.js Image doesn't handle ICO well
    if (isIco) {
      return (
        <div className={`${s.container} rounded-lg overflow-hidden shrink-0 bg-white border border-slate-100 ${className}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={`${broker.name} logo`}
            width={s.img}
            height={s.img}
            className="w-full h-full object-contain p-0.5"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            onError={() => setImgError(true)}
          />
        </div>
      );
    }

    return (
      <div className={`${s.container} rounded-lg overflow-hidden shrink-0 bg-white border border-slate-100 ${className}`}>
        <Image
          src={logoUrl}
          alt={`${broker.name} logo`}
          width={s.img}
          height={s.img}
          className="w-full h-full object-contain p-0.5"
          sizes={`${s.img}px`}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          onError={() => setImgError(true)}
          placeholder="blur"
          blurDataURL={blurDataURL(broker.color)}
        />
      </div>
    );
  }

  return <LetterFallback broker={broker} s={s} />;
}
