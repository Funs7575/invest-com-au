"use client";

import Icon from "@/components/Icon";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/**
 * Live "this is exactly what pros will see" preview. Mirrors
 * `maskBriefForProvider` (lib/briefs/mask.ts): the masked inbox card shows
 * the title, template, budget, location and a 280-char description preview —
 * never the contact details. Updates as the user types so they can see their
 * brief take shape from the provider's side.
 */

const PREVIEW_MAX = 280;

export interface BriefPreviewCardProps {
  intentLabel?: string | null;
  title: string;
  description: string;
  budgetLabel?: string | null;
  locationState?: string | null;
  providerPreferenceLabel?: string | null;
  className?: string;
}

export default function BriefPreviewCard({
  intentLabel,
  title,
  description,
  budgetLabel,
  locationState,
  providerPreferenceLabel,
  className = "",
}: BriefPreviewCardProps) {
  const preview = description.trim();
  const truncated =
    preview.length > PREVIEW_MAX ? `${preview.slice(0, PREVIEW_MAX)}…` : preview;

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Icon name="eye" size={13} className="text-slate-400" />
          What pros will see
        </span>
        <Badge variant="success" size="sm">
          <Icon name="shield-check" size={11} /> Masked preview
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {intentLabel && (
            <Badge variant="gold" size="sm">
              {intentLabel}
            </Badge>
          )}
          {locationState && (
            <Badge variant="default" size="sm">
              <Icon name="map-pin" size={10} /> {locationState}
            </Badge>
          )}
          {budgetLabel && (
            <Badge variant="default" size="sm">
              <Icon name="dollar-sign" size={10} /> {budgetLabel}
            </Badge>
          )}
        </div>

        <p
          className={cn(
            "text-sm font-bold leading-snug",
            title.trim() ? "text-slate-900" : "text-slate-300",
          )}
        >
          {title.trim() || "Your title will appear here…"}
        </p>

        <p
          className={cn(
            "text-xs leading-relaxed whitespace-pre-wrap",
            truncated ? "text-slate-600" : "text-slate-300",
          )}
        >
          {truncated ||
            "As you describe your situation, pros will see a clear summary here — enough to decide they're a fit, without your contact details."}
        </p>

        {providerPreferenceLabel && (
          <p className="text-[0.7rem] text-slate-500">
            Routed to: <span className="font-semibold text-slate-500">{providerPreferenceLabel}</span>
          </p>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.7rem] leading-relaxed text-slate-500">
          <Icon name="lock" size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <span>
            Your name, email and phone stay hidden until a verified pro responds
            and you choose to share them.
          </span>
        </div>
      </div>
    </div>
  );
}
