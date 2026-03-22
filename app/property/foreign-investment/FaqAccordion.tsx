"use client";

import { useState } from "react";
import { FIRB_FAQS } from "@/lib/firb-data";

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
      {FIRB_FAQS.map((faq, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
            aria-expanded={open === i}
          >
            <span className="text-sm font-semibold text-slate-900 leading-snug">{faq.question}</span>
            <svg
              className={`shrink-0 w-4 h-4 text-slate-400 transition-transform ${open === i ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open === i && (
            <div className="px-5 pb-4">
              <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
