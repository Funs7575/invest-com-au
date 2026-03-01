"use client";

import { useState, useEffect, useRef } from "react";

interface TocItem {
  id: string;
  label: string;
}

export default function OnThisPage({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    // Set initial active
    setActiveId(items[0].id);

    // IntersectionObserver to track which section is in view
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    setActiveId(id);
    setIsExpanded(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (items.length < 2) return null;

  return (
    <>
      {/* Desktop: sticky sidebar TOC — shown on large screens */}
      <nav
        className="hidden xl:block fixed top-24 right-4 w-48 2xl:w-52 max-h-[calc(100vh-120px)] overflow-y-auto z-30 scrollbar-hide"
        aria-label="On this page"
      >
        <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-400 mb-2">
          On this page
        </p>
        <ul className="space-y-0.5 border-l-2 border-slate-100">
          {items.map(({ id, label }) => (
            <li key={id}>
              <button
                onClick={() => handleClick(id)}
                className={`block w-full text-left pl-3 py-1 text-xs leading-snug transition-all duration-200 ${
                  activeId === id
                    ? "text-blue-700 font-semibold border-l-2 border-blue-700 -ml-[2px]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile: compact bottom pill */}
      <div className="xl:hidden fixed bottom-3 left-3 right-3 z-40">
        {/* Collapsed — slim pill with section indicator */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full shadow-lg text-xs font-medium text-slate-600 motion-safe:animate-[fadeInUp_0.3s_ease-out]"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="font-semibold text-slate-700">Contents</span>
            </span>
            <span className="text-[0.69rem] text-slate-400 truncate max-w-[45%] text-right">
              {items.find((i) => i.id === activeId)?.label}
            </span>
          </button>
        )}

        {/* Expanded — compact overlay */}
        {isExpanded && (
          <>
            {/* Backdrop — tap to dismiss */}
            <div
              className="fixed inset-0 bg-black/20 -z-10"
              role="presentation"
              onClick={() => setIsExpanded(false)}
            />
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl p-3 motion-safe:animate-[fadeInUp_0.15s_ease-out]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-400">
                  On this page
                </p>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 -mr-0.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  aria-label="Close navigation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ul className="space-y-px max-h-48 overflow-y-auto overscroll-contain">
                {items.map(({ id, label }, idx) => (
                  <li key={id}>
                    <button
                      onClick={() => handleClick(id)}
                      className={`w-full text-left px-2.5 py-2 text-[0.8rem] leading-snug rounded-lg transition-all duration-150 flex items-start gap-2 ${
                        activeId === id
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-600 active:bg-slate-50"
                      }`}
                    >
                      <span className={`shrink-0 text-[0.69rem] font-semibold mt-px ${activeId === id ? "text-blue-500" : "text-slate-400"}`}>
                        {idx + 1}
                      </span>
                      <span className="line-clamp-2">{label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}
