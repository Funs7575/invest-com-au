"use client";

import { useCallback, useEffect, useState } from "react";

interface ToastProps {
  message: string;
  visible: boolean;
  onDone?: () => void;
  duration?: number;
  icon?: "check" | "copy" | "download";
}

/**
 * useToast - imperative toast hook for admin pages.
 * Usage: const { toast } = useToast();  toast("Saved!", "success");
 * No extra JSX needed - renders via DOM.
 */
export function useToast() {
  const toast = useCallback((message: string, variant?: "success" | "error" | "info") => {
    // Remove existing toast if any
    const existing = document.getElementById("__imperative_toast");
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.id = "__imperative_toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.className =
      "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-full shadow-lg text-sm font-medium text-slate-700 toast-enter";

    const isError = variant === "error";
    const iconColor = isError ? "text-red-500" : "text-emerald-600";
    const iconPath = isError
      ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>'
      : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>';

    // Build with textContent to avoid XSS
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", `w-4 h-4 ${iconColor}`);
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.innerHTML = iconPath;
    el.appendChild(svg);

    const span = document.createElement("span");
    span.textContent = message;
    el.appendChild(span);

    document.body.appendChild(el);

    setTimeout(() => {
      el.classList.remove("toast-enter");
      el.classList.add("toast-exit");
      setTimeout(() => el.remove(), 200);
    }, 1500);
  }, []);

  return { toast };
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
