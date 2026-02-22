"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

/**
 * Scroll-triggered fade-in wrapper.
 * Animation class deferred until after hydration so SSR content stays visible.
 */
export default function ScrollFadeIn({
  children,
  delay,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  const delayClass = delay ? `delay-${delay}` : "";
  const animClass = mounted ? `scroll-fade-in ${delayClass}` : "";

  return (
    <div ref={ref} className={`${animClass} ${className}`.trim()}>
      {children}
    </div>
  );
}
