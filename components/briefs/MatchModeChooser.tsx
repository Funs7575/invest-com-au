"use client";

import Icon from "@/components/Icon";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import ResultCount from "@/components/directory/ResultCount";
import { cn } from "@/lib/utils";

/**
 * "How do you want to be matched?" — reframed around the marketplace promise:
 * post once, get responses from multiple verified pros, and choose. The
 * multi-response mode leads as the recommended default.
 *
 * Honest social proof only: the live pro-supply count is passed from the
 * server (a real `professionals` count) and rendered solely above a floor, so
 * we never advertise an empty marketplace.
 */

const SUPPLY_FLOOR = 12;

interface ModeDef {
  value: string;
  title: string;
  blurb: string;
  icon: string;
  recommended?: boolean;
}

const MODES: ModeDef[] = [
  {
    value: "multi_response",
    title: "Open to multiple pros",
    blurb: "Several verified pros can respond. Compare them side by side and choose the best fit — like getting quotes.",
    icon: "users",
    recommended: true,
  },
  {
    value: "smart_match",
    title: "Smart match",
    blurb: "We route your brief to the best-fit verified pros and notify them for you.",
    icon: "target",
  },
  {
    value: "direct",
    title: "Send to one specific pro",
    blurb: "Have someone in mind? Enter the slug from their profile URL.",
    icon: "user-check",
  },
];

const PROVIDER_TYPES = [
  { value: "any", label: "No preference — widest response" },
  { value: "individual", label: "Individual expert" },
  { value: "firm", label: "Firm / brokerage" },
  { value: "expert_team", label: "Expert team (multi-discipline)" },
];

export interface MatchPatch {
  routing_mode?: string;
  provider_preference?: string;
  target_team_slug?: string;
}

export interface MatchModeChooserProps {
  routingMode: string;
  providerPreference: string;
  targetSlug: string;
  proSubscriber: boolean;
  proSupply: number | null;
  onChange: (patch: MatchPatch) => void;
  className?: string;
}

export default function MatchModeChooser({
  routingMode,
  providerPreference,
  targetSlug,
  proSubscriber,
  proSupply,
  onChange,
  className = "",
}: MatchModeChooserProps) {
  const showSupply = proSupply != null && proSupply >= SUPPLY_FLOOR;
  const proPerkActive =
    routingMode === "direct" && providerPreference === "expert_team";

  return (
    <div className={cn("space-y-6", className)}>
      {/* Honest live social proof */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        {showSupply ? (
          <ResultCount
            total={proSupply ?? 0}
            pills={[
              {
                tone: "live",
                count: proSupply ?? 0,
                label: "verified pros ready to respond",
              },
            ]}
          />
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
            Verified pros across Australia
          </p>
        )}
        <p className="mt-1.5 text-xs leading-relaxed text-emerald-800/80">
          Matching pros are notified the moment you post. You&apos;ll get an email
          as soon as one responds — then you compare and choose. Your contact
          details stay private until then.
        </p>
      </div>

      {/* Investor Pro perk */}
      {proSubscriber && (
        <div className="rounded-xl border border-violet-300 bg-violet-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={proPerkActive}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange({ routing_mode: "direct", provider_preference: "expert_team" });
                } else {
                  onChange({ routing_mode: "multi_response" });
                }
              }}
              className="mt-0.5 h-4 w-4 rounded border-violet-400 text-violet-600 focus:ring-violet-500"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-violet-900">
                <Icon name="crown" size={14} /> Skip the queue · Investor Pro
              </span>
              <span className="mt-0.5 block text-xs text-violet-800">
                Route directly to a verified Expert Team of your choice — they see
                your brief in their inbox immediately, bypassing the smart-match
                window.
              </span>
            </span>
          </label>
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700">
          How would you like to hear back?
        </legend>
        <div className="grid grid-cols-1 gap-3">
          {MODES.map((mode) => {
            const active = routingMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ routing_mode: mode.value })}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                  active
                    ? "border-amber-500 ring-2 ring-amber-300 bg-amber-50"
                    : "border-slate-200 bg-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    active ? "bg-amber-500 text-slate-900" : "bg-slate-100 text-slate-500",
                  )}
                  aria-hidden
                >
                  <Icon name={mode.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{mode.title}</span>
                    {mode.recommended && (
                      <Badge variant="success" size="sm">
                        Recommended
                      </Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                    {mode.blurb}
                  </span>
                </span>
                {active && <Icon name="check-circle" size={18} className="shrink-0 text-amber-600" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      {routingMode === "direct" && (
        <Input
          id="brief-target-slug"
          label="Pro / team / firm profile slug"
          hint="Use the slug from a verified profile URL, e.g. sydney-smsf-property-team."
          value={targetSlug}
          onChange={(e) => onChange({ target_team_slug: e.target.value })}
          placeholder="e.g. sydney-smsf-property-team"
          maxLength={120}
        />
      )}

      <div className="border-t border-slate-100 pt-5">
        <Select
          id="brief-provider-type"
          label="Provider type (optional)"
          hint="Leave it open for the widest response, or narrow it if you have a preference."
          value={providerPreference === "multiple" ? "any" : providerPreference}
          onChange={(e) => onChange({ provider_preference: e.target.value })}
          options={PROVIDER_TYPES}
        />
      </div>
    </div>
  );
}
