"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import type { ProfessionalType } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

/**
 * Badge that marks a forum post / community contribution as having been
 * authored by a verified advisor on Invest.com.au.
 *
 * The forum currently uses `forum_user_profiles.badge` as a free-text field.
 * The community thread renderer can pass that value in here, and if it
 * matches a known ProfessionalType slug, this component renders a tasteful
 * pill linking back to the advisor's profile.
 */

interface Props {
  /** Slug of the matched advisor — used to link to /advisor/[slug]. */
  advisorSlug?: string | null;
  /** ProfessionalType (e.g. 'mortgage_broker'). */
  advisorType?: ProfessionalType | string | null;
  /** Show only the icon — used in compact post-meta rows. */
  iconOnly?: boolean;
  className?: string;
}

export default function VerifiedAdvisorBadge({
  advisorSlug,
  advisorType,
  iconOnly = false,
  className = "",
}: Props) {
  if (!advisorType) return null;

  const label =
    PROFESSIONAL_TYPE_LABELS[advisorType as ProfessionalType] ||
    String(advisorType).replace(/_/g, " ");

  const inner = (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
      title={`Verified ${label} on Invest.com.au`}
    >
      <Icon name="badge-check" size={11} />
      {!iconOnly && <span>Verified {label}</span>}
    </span>
  );

  if (advisorSlug) {
    return (
      <Link href={`/advisor/${advisorSlug}`} className="hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}
