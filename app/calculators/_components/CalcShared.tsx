"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/* ──────────────────────────────────────────────
   URL state sync helpers
   ────────────────────────────────────────────── */
export function getParam(sp: URLSearchParams, key: string): string | null {
  return sp.get(key);
}

export function useUrlSync(params: Record<string, string>, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerialized = useRef<string>("");
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const parsed = JSON.parse(paramsKey) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed)) {
        if (v) {
          url.searchParams.set(k, v);
        } else {
          url.searchParams.delete(k);
        }
      }
      const serialized = url.searchParams.toString();
      if (serialized !== lastSerialized.current) {
        lastSerialized.current = serialized;
        window.history.replaceState(null, "", url.toString());
      }
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [paramsKey, delay]);
}

/* ──────────────────────────────────────────────
   Share Results button
   ────────────────────────────────────────────── */
export function ShareResultsButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <div className="mt-4 flex items-center gap-3 text-xs">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        {copied ? "Copied!" : "Share Results"}
      </button>
      <Link href="/methodology" className="text-slate-400 hover:text-slate-600 transition-colors">
        How we calculated this →
      </Link>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Animated number – smooth counting transitions
   ────────────────────────────────────────────── */
export function AnimatedNumber({ value, prefix = "$", decimals = 2 }: { value: number; prefix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const ref = useRef(value);
  useEffect(() => {
    const start = ref.current;
    const end = value;
    if (start !== end) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
    const duration = 400;
    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      setDisplay(start + (end - start) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    ref.current = end;
  }, [value]);
  return (
    <span className={`inline-block transition-colors duration-300 ${flash ? "text-slate-700" : ""}`}>
      {prefix}
      {display.toLocaleString("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}

/* ──────────────────────────────────────────────
   Shared UI Components
   ────────────────────────────────────────────── */

export function CalcSection({ id, iconName, title, desc, children }: {
  id: string; iconName: string; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-white border border-slate-200 rounded-xl md:rounded-2xl p-3.5 md:p-8 shadow-sm">
      <div className="flex items-start gap-2 md:gap-3 mb-0.5 md:mb-1">
        <Icon name={iconName} size={18} className="text-slate-700 shrink-0 mt-0.5 md:hidden" />
        <Icon name={iconName} size={24} className="text-slate-700 shrink-0 mt-0.5 hidden md:block" />
        <h2 className="text-base md:text-xl font-extrabold text-slate-900">{title}</h2>
      </div>
      <p className="text-[0.69rem] md:text-sm text-slate-500 mb-3 md:mb-6 ml-[26px] md:ml-10">{desc}</p>
      {children}
    </section>
  );
}

export function InputField({ label, value, onChange, placeholder, prefix, suffix }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string; suffix?: string;
}) {
  return (
    <div>
      <label className="block text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 md:mb-1.5">{label}</label>
      <div className="relative">
        {prefix && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">{prefix}</div>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-white border border-slate-200 rounded-lg py-2 md:py-2.5 text-sm shadow-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all font-medium ${prefix ? "pl-7" : "pl-3 md:pl-4"} ${suffix ? "pr-10" : "pr-3 md:pr-4"}`}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">{suffix}</div>}
      </div>
    </div>
  );
}

export function SelectField({ label, value, onChange, placeholder, children }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 shadow-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all font-medium"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </div>
  );
}

export function ResultBox({ label, value, positive, negative }: {
  label: string; value: string; positive?: boolean; negative?: boolean;
}) {
  const bg = positive ? "bg-emerald-50 border-emerald-200" : negative ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200";
  const textColor = positive ? "text-emerald-800" : negative ? "text-red-600" : "text-slate-900";

  return (
    <div className={`rounded-xl p-3.5 border ${bg}`}>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-extrabold tracking-tight ${textColor}`}>{value}</div>
    </div>
  );
}

export function WaterfallBar({ label, value, width, color, valueColor }: {
  label: string; value: string; width: number; color: string; valueColor?: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-slate-600 font-semibold">{label}</span>
        <span className={`font-bold ${valueColor || "text-slate-900"}`}>{value}</span>
      </div>
      <div className="h-9 w-full bg-slate-100 rounded-lg overflow-hidden flex items-center px-1">
        <div
          className={`h-7 rounded-md transition-all duration-500 ease-out ${color}`}
          style={{ width: `${Math.max(Math.min(width, 100), 2)}%` }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Constants
   ────────────────────────────────────────────── */
export const CORPORATE_TAX_RATE = 0.3;
export const TRANSFER_FEE = 54;
export const TAX_BRACKETS = [0, 19, 32.5, 37, 45];
