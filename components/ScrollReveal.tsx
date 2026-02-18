"use client";

import { useRef, useEffect, type ReactNode } from "react";

/**
 * Generic scroll-triggered animation wrapper.
 * Adds `is-visible` class when the element enters the viewport.
 * Works with CSS classes like:
 *   scroll-fade-in, scroll-slide-left, scroll-slide-right,
 *   scroll-stagger-children, scroll-check-stagger,
 *   table-row-stagger, fee-row-stagger
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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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
  }, [threshold]);

  const delayClass = delay ? `delay-${delay}` : "";

  return (
    // @ts-expect-error - dynamic tag element
    <Tag ref={ref} className={`${animation} ${delayClass} ${className}`}>
      {children}
    </Tag>
  );
}
