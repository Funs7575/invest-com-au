"use client";

import { useState } from "react";
import { ADVERTISER_DISCLOSURE, GENERAL_ADVICE_WARNING, CRYPTO_WARNING, REGULATORY_NOTE } from "@/lib/compliance";

const sections = [
  { title: "General Advice Warning", content: GENERAL_ADVICE_WARNING },
  { title: "Affiliate Disclosure", content: ADVERTISER_DISCLOSURE },
  { title: "Crypto Warning", content: CRYPTO_WARNING },
  { title: "Regulatory Note", content: REGULATORY_NOTE },
];

export default function CompactDisclosure() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-1">
      {sections.map((section, i) => (
        <div key={i}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between py-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            aria-expanded={openIndex === i}
          >
            <span className="font-semibold">{section.title}</span>
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIndex === i && (
            <p className="text-xs text-slate-500 leading-relaxed pb-2">
              {section.content}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
