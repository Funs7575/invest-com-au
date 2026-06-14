"use client";

/**
 * Advisor-portal design-system primitives (slate + indigo).
 *
 * One accent (indigo-600), a neutral slate base, and a disciplined type scale:
 * eyebrow/label = text-xs, body = text-sm, KPI = text-2xl/3xl — replacing the
 * ad-hoc `text-[0.5rem]…[0.68rem]` soup that made the portal feel unpolished.
 * Every portal surface should compose these instead of re-styling cards inline.
 */

import React from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/** White surface card with an optional header (title + right-aligned action). */
export function SectionCard({
  title,
  icon,
  action,
  children,
  className = "",
  bodyClassName = "p-5",
}: {
  title?: React.ReactNode;
  icon?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            {icon && <Icon name={icon} size={15} className="text-slate-400 shrink-0" />}
            {title && <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** A single KPI tile: muted label, big tabular number, optional sub + delta. */
export function StatCard({
  label,
  value,
  sub,
  icon,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: string;
  /** Signed period delta, e.g. +3 / -1. Coloured emerald/red, omitted when 0/undefined. */
  delta?: number | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon && <Icon name={icon} size={15} className="text-slate-300" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{value}</span>
        {delta != null && delta !== 0 && (
          <span
            className={`text-xs font-semibold tabular-nums ${
              delta > 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

/** Calm, consistent empty state — never let a widget silently disappear. */
export function EmptyState({
  icon = "inbox",
  title,
  children,
  cta,
}: {
  icon?: string;
  title: string;
  children?: React.ReactNode;
  cta?: { label: string; href?: string; onClick?: () => void; external?: boolean };
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <Icon name={icon} size={18} className="text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {children && <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{children}</p>}
      {cta &&
        (cta.href ? (
          <Link
            href={cta.href}
            target={cta.external ? "_blank" : undefined}
            rel={cta.external ? "noopener noreferrer" : undefined}
            className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {cta.label} →
          </Link>
        ) : (
          <button
            onClick={cta.onClick}
            className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {cta.label} →
          </button>
        ))}
    </div>
  );
}

/** Indigo progress bar with a consistent track. */
export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  new: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  contacted: "bg-blue-50 text-blue-700 ring-blue-200",
  converted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lost: "bg-red-50 text-red-600 ring-red-200",
};

/** Lead-status chip — semantic colour, consistent shape. */
export function StatusPill({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${cls}`}
    >
      {status}
    </span>
  );
}

/**
 * Minimal bar chart with a baseline axis + a faint max gridline — reads as a
 * real chart, not a row of naked divs. Renders an inline empty state (a flat
 * baseline + message) rather than vanishing when there's no data.
 */
export function MiniBarChart({
  data,
  height = 112,
  emptyLabel = "No data yet",
  showValues = true,
  showLabels = true,
}: {
  data: { label: string; value: number }[];
  height?: number;
  emptyLabel?: string;
  showValues?: boolean;
  showLabels?: boolean;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="relative" style={{ height }}>
        <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-slate-200" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-slate-400">{emptyLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              {showValues && (
                <span className="text-xs font-semibold tabular-nums text-slate-600">{d.value}</span>
              )}
              <div
                className="w-full rounded-t bg-indigo-500 transition-all duration-300 hover:bg-indigo-600"
                style={{ height: `${Math.max(pct, 2)}%`, minHeight: 3 }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="mt-1.5 flex gap-1.5 border-t border-slate-100 pt-1.5">
          {data.map((d, i) => (
            <span key={i} className="flex-1 truncate text-center text-[0.7rem] text-slate-400">
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Section eyebrow used between stacked cards (e.g. "Performance"). */
export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-slate-400 first:mt-0">
      {children}
    </h2>
  );
}
