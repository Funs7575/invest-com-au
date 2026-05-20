"use client";

import Icon from "@/components/Icon";

/**
 * Canonical tab-bar primitive for directory pages.
 *
 * Supports two visual variants today:
 *
 *   - "segmented"  — pill segmented control on a slate-100 background.
 *                    Active tab has a white surface + shadow. Used for
 *                    the /advisors provider-type bar.
 *   - "chip"       — standalone borderless pills. Active tab gets a
 *                    slate-100 fill + ring. Used for /invest
 *                    category sub-row.
 *
 * Per-tab visual customization (per-kind accent colours on the /invest
 * kind row) is intentionally NOT supported by this primitive — that
 * row has 8+ unique accent palettes that don't generalise. Keep it as
 * a bespoke render until the design system formalises a kind colour
 * scale.
 *
 * Zero-count behaviour
 * --------------------
 * By default, tabs with count===0 are HIDDEN (so users never see
 * dead-end "Expert Teams 0" affordances). Pass
 * zeroCountBehavior="disable" to grey them out, or "show" to render
 * normally (when zero is informative — e.g. "All categories with no
 * results yet").
 *
 * The `alwaysShow` id (typically "all") is exempt from zero-count
 * filtering — even when the universe is empty, the "All" tab should
 * still be there to anchor the bar.
 *
 * Accessibility
 * -------------
 *  - role="tablist" on the wrapper with the supplied ariaLabel
 *  - role="tab" + aria-selected on each tab
 *  - Wrapper is horizontally scrollable on overflow (whitespace-nowrap)
 *    with scrollbar-hide so mobile users don't see the native scrollbar.
 */
export interface TabBarItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  /** Icon name from the lucide icon set; rendered to the left of the label. */
  icon?: string;
}

export interface TabBarProps<T extends string = string> {
  tabs: ReadonlyArray<TabBarItem<T>>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  variant: "segmented" | "chip";
  /** Default: "hide". */
  zeroCountBehavior?: "hide" | "disable" | "show";
  /** Tab id that should never be filtered out by zero-count rules. */
  alwaysShow?: T;
  className?: string;
}

export default function TabBar<T extends string = string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  variant,
  zeroCountBehavior = "hide",
  alwaysShow,
  className = "",
}: TabBarProps<T>) {
  const visible = tabs.filter((t) => {
    if (alwaysShow && t.id === alwaysShow) return true;
    if (typeof t.count !== "number") return true;
    if (t.count > 0) return true;
    return zeroCountBehavior !== "hide";
  });

  if (visible.length === 0) return null;

  if (variant === "segmented") {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={`flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-hide ${className}`}
      >
        {visible.map((t) => (
          <SegmentedTab
            key={t.id}
            tab={t}
            active={t.id === value}
            disabled={zeroCountBehavior === "disable" && t.count === 0 && t.id !== alwaysShow}
            onClick={() => onChange(t.id)}
          />
        ))}
      </div>
    );
  }

  // chip
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`overflow-x-auto scrollbar-hide -mx-1 px-1 ${className}`}
    >
      <div className="flex items-center gap-1.5 min-w-max">
        {visible.map((t) => (
          <ChipTab
            key={t.id}
            tab={t}
            active={t.id === value}
            isAll={alwaysShow !== undefined && t.id === alwaysShow}
            disabled={zeroCountBehavior === "disable" && t.count === 0 && t.id !== alwaysShow}
            onClick={() => onChange(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface InternalTabProps<T extends string = string> {
  tab: TabBarItem<T>;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}

function SegmentedTab<T extends string = string>({
  tab,
  active,
  disabled,
  onClick,
}: InternalTabProps<T>) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : disabled
            ? "text-slate-300 cursor-not-allowed"
            : "text-slate-600 hover:bg-white/60"
      }`}
    >
      {tab.icon && <Icon name={tab.icon} size={12} aria-hidden />}
      {tab.label}
      {typeof tab.count === "number" && (
        <span
          className={`text-[0.6rem] md:text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${
            active ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-500"
          }`}
        >
          {tab.count}
        </span>
      )}
    </button>
  );
}

function ChipTab<T extends string = string>({
  tab,
  active,
  isAll,
  disabled,
  onClick,
}: InternalTabProps<T> & { isAll: boolean }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1 text-[0.7rem] font-medium transition-all inline-flex items-center gap-1 ${
        active
          ? "bg-slate-100 text-slate-900 ring-1 ring-slate-300"
          : disabled
            ? "text-slate-300 cursor-not-allowed"
            : "text-slate-500 hover:bg-slate-50"
      }`}
    >
      {tab.icon && <Icon name={tab.icon} size={11} aria-hidden />}
      {tab.label}
      {!isAll && typeof tab.count === "number" && (
        <span
          className={`text-[0.55rem] font-bold tabular-nums ${
            disabled ? "text-slate-300" : "text-slate-400"
          }`}
        >
          {tab.count}
        </span>
      )}
    </button>
  );
}
