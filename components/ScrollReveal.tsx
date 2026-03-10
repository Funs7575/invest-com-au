"use client";

import React, { useRef, useEffect, useState, createElement, type ReactNode } from "react";

/**
 * Generic scroll-triggered animation wrapper.
 * Adds `is-visible` class when the element enters the viewport.
 *
 * Important: The animation class is only applied after hydration to prevent
 * content from being invisible during SSR (the CSS sets opacity:0 by default).
 * This ensures content is always visible on first paint.
 */
export default function ScrollReveal({
  children,
  animation = "scroll-fade-in",
  delay,
  className = "",
  as: Tag = "div",
  threshold = 0.1,
}: {
  children: ReactNode;
  animation?: string;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "ul" | "table";
  threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  // Only apply the animation class after hydration so SSR content is visible
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = ref.current;
    if (!el) return;

    // If already in viewport, show immediately (no animation delay)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, mounted]);

  const delayClass = delay ? `delay-${delay}` : "";
  // Before hydration: no animation class → content visible (no opacity:0)
  // After hydration: animation class applied → scroll-trigger works
  const animClass = mounted ? `${animation} ${delayClass}` : "";

  return createElement(
    Tag,
    { ref: ref as React.Ref<HTMLElement>, className: `${animClass} ${className}`.trim() },
    children
  );
}
