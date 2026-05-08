"use client";

/**
 * Client wrapper around <Link> that fires a Country Mode trackEvent on
 * click. Used by the homepage preview strips so we can attribute clicks
 * to the country dimension instead of having to reconstruct from
 * pathname + cookie on every $pageview.
 *
 * Tracking is fire-and-forget — failures must not block navigation.
 */

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent } from "@/lib/tracking";

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>;

interface TrackedCountryLinkProps extends LinkProps, AnchorProps {
  eventType: string;
  eventData?: Record<string, unknown>;
  children: ReactNode;
}

export default function TrackedCountryLink({
  eventType,
  eventData,
  onClick,
  children,
  ...linkProps
}: TrackedCountryLinkProps) {
  return (
    <Link
      {...linkProps}
      onClick={(event) => {
        try {
          trackEvent(eventType, eventData);
        } catch {
          // Never block navigation on a tracking failure.
        }
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
