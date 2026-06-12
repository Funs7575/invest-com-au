"use client";

import { useCallback, useEffect, useState } from "react";

interface ToastProps {
  message: string;
  visible: boolean;
  onDone?: () => void;
  duration?: number;
  icon?: "check" | "copy" | "download";
}

export interface RichToastOptions {
  title: string;
  body?: string;
  icon?: "check" | "spark" | "flame" | "trophy";
  actionLabel?: string;
  actionHref?: string;
  duration?: number;
  /** Milestone styling: amber ring + a small confetti burst (skipped under reduced motion). */
  milestone?: boolean;
}

type QueueItem =
  | { kind: "plain"; message: string; variant?: "success" | "error" | "info"; duration: number }
  | ({ kind: "rich" } & Required<Pick<RichToastOptions, "title" | "duration">> &
      Omit<RichToastOptions, "title" | "duration">);

/* ------------------------------------------------------------------ */
/* Imperative queued engine (RETAIL_UX_NORTHSTAR §7.1 Toast v2).        */
/* One toast visible at a time; later calls queue FIFO. Identical       */
/* back-to-back messages are dropped so double-fires don't stack.      */
/* DOM-imperative by design: callable from any client code without a   */
/* provider, matching the original useToast contract.                  */
/* ------------------------------------------------------------------ */

const TOAST_ID = "__imperative_toast";
const queue: QueueItem[] = [];
let showing = false;
let lastSignature = "";

const ICON_PATHS: Record<string, string> = {
  check: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>',
  error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>',
  spark:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.4-6.4l-2.1 2.1M8.7 15.3l-2.1 2.1m0-10.8l2.1 2.1m6.6 6.6l2.1 2.1"/>',
  flame:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c1 3-3 4.5-3 8a3 3 0 006 0c0-1 -.5-2-1-2.5 2 .5 4 2.5 4 5.5a6 6 0 11-12 0c0-5 5-7 6-11z"/>',
  trophy:
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 21h8m-4-4v4m-5-17h10v4a5 5 0 01-10 0V4zm-3 1h3v2a3 3 0 01-3-3zm16 0h-3v2a3 3 0 003-3z"/>',
};

function svgIcon(name: string, colorClass: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", `w-4 h-4 shrink-0 ${colorClass}`);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = ICON_PATHS[name] ?? ICON_PATHS.check ?? "";
  return svg;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function appendConfetti(el: HTMLElement) {
  if (prefersReducedMotion()) return;
  const container = document.createElement("div");
  container.className = "confetti-container confetti-active";
  container.setAttribute("aria-hidden", "true");
  const colors = ["#f59e0b", "#f25822", "#10b981", "#3b82f6", "#8b5cf6"];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement("span");
    p.className = "confetti-particle";
    p.style.setProperty("--confetti-color", colors[i % colors.length] ?? "#f59e0b");
    p.style.setProperty("--confetti-x", `${-50 + Math.random() * 100}px`);
    p.style.setProperty("--confetti-delay", `${i * 0.04}s`);
    p.style.setProperty("--confetti-fall", `${50 + Math.random() * 50}px`);
    p.style.setProperty("--confetti-rotate", `${180 + Math.random() * 360}deg`);
    p.style.left = `${10 + Math.random() * 80}%`;
    container.appendChild(p);
  }
  el.appendChild(container);
}

function renderItem(item: QueueItem) {
  showing = true;
  const el = document.createElement("div");
  el.id = TOAST_ID;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");

  if (item.kind === "plain") {
    el.className =
      "fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg text-sm font-medium text-slate-700 dark:text-slate-200 toast-enter";
    const isError = item.variant === "error";
    el.appendChild(svgIcon(isError ? "error" : "check", isError ? "text-red-500" : "text-emerald-600"));
    const span = document.createElement("span");
    span.textContent = item.message;
    el.appendChild(span);
  } else {
    el.className =
      "fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm px-4 py-3 bg-white dark:bg-slate-800 border rounded-2xl shadow-xl toast-enter " +
      (item.milestone ? "border-amber-300 dark:border-amber-500/60" : "border-slate-200 dark:border-slate-700");

    const row = document.createElement("div");
    row.className = "relative flex items-start gap-2.5";
    const iconWrap = document.createElement("div");
    iconWrap.className =
      "mt-0.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center " +
      (item.milestone ? "bg-amber-100 dark:bg-amber-500/20" : "bg-emerald-50 dark:bg-emerald-500/15");
    iconWrap.appendChild(
      svgIcon(item.icon ?? "check", item.milestone ? "text-amber-600" : "text-emerald-600"),
    );
    row.appendChild(iconWrap);

    const textCol = document.createElement("div");
    textCol.className = "min-w-0";
    const titleEl = document.createElement("p");
    titleEl.className = "text-sm font-bold text-slate-900 dark:text-slate-100";
    titleEl.textContent = item.title;
    textCol.appendChild(titleEl);
    if (item.body) {
      const bodyEl = document.createElement("p");
      bodyEl.className = "text-xs text-slate-600 dark:text-slate-300 mt-0.5";
      bodyEl.textContent = item.body;
      textCol.appendChild(bodyEl);
    }
    if (item.actionLabel && item.actionHref) {
      const a = document.createElement("a");
      a.href = item.actionHref;
      a.className = "inline-block mt-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline";
      a.textContent = item.actionLabel;
      textCol.appendChild(a);
    }
    row.appendChild(textCol);
    el.appendChild(row);
    if (item.milestone) appendConfetti(el);
  }

  document.body.appendChild(el);
  const duration = item.duration;
  setTimeout(() => {
    el.classList.remove("toast-enter");
    el.classList.add("toast-exit");
    setTimeout(() => {
      el.remove();
      showing = false;
      const next = queue.shift();
      if (next) renderItem(next);
    }, 200);
  }, duration);
}

function enqueue(item: QueueItem) {
  if (typeof document === "undefined") return;
  const signature = item.kind === "plain" ? `p:${item.message}` : `r:${item.title}`;
  // Drop exact repeats while one is visible/queued (double-click protection).
  if (signature === lastSignature && (showing || queue.length > 0)) return;
  lastSignature = signature;
  if (showing) {
    if (queue.length < 3) queue.push(item);
    return;
  }
  renderItem(item);
}

/** Light pill toast — original API, unchanged for existing call sites. */
export function showToast(message: string, variant?: "success" | "error" | "info", duration = 1500) {
  enqueue({ kind: "plain", message, variant, duration });
}

/** Rich card toast for celebration moments (D1/D7) — title, body, action link, optional milestone confetti. */
export function showRichToast(opts: RichToastOptions) {
  enqueue({
    kind: "rich",
    title: opts.title,
    body: opts.body,
    icon: opts.icon,
    actionLabel: opts.actionLabel,
    actionHref: opts.actionHref,
    milestone: opts.milestone,
    duration: opts.duration ?? (opts.milestone ? 4500 : 3500),
  });
}

/**
 * useToast — imperative toast hook.
 * Usage: const { toast, toastRich } = useToast();  toast("Saved!", "success");
 * No extra JSX needed — renders via DOM, queued one-at-a-time.
 */
export function useToast() {
  const toast = useCallback(
    (message: string, variant?: "success" | "error" | "info", duration = 1500) =>
      showToast(message, variant, duration),
    [],
  );
  const toastRich = useCallback((opts: RichToastOptions) => showRichToast(opts), []);
  return { toast, toastRich };
}

/** Passthrough provider for admin layout - useToast is imperative so no context needed. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function Toast({
  message,
  visible,
  onDone,
  duration = 1500,
  icon = "check",
}: ToastProps) {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true);

      setExiting(false);
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => {
          setShow(false);
          setExiting(false);
          onDone?.();
        }, 200);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDone]);

  if (!show) return null;

  const iconSvg =
    icon === "check" ? (
      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ) : icon === "copy" ? (
      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    );

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-full shadow-lg text-sm font-medium text-slate-700 ${
        exiting ? "toast-exit" : "toast-enter"
      }`}
      role="status"
      aria-live="polite"
    >
      {iconSvg}
      {message}
    </div>
  );
}
