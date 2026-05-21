"use client";

import { useState } from "react";
import { WIDGET_CATALOGUE } from "@/lib/widget/types";

const BASE = "https://invest.com.au/api/widget";

function snippetFor(slug: string): string {
  return `<script src="${BASE}?widget=${slug}"></script>`;
}

/**
 * Browsable gallery of the curated `?widget=` catalogue (E1). Each card shows
 * a ready-made widget and a one-click copy of its embed snippet, so publishers
 * can discover the available widgets without learning the query-param API.
 */
export default function WidgetGallery() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(slug: string) {
    const snippet = snippetFor(slug);
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = snippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(slug);
    setTimeout(() => setCopied((c) => (c === slug ? null : c)), 2000);
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {WIDGET_CATALOGUE.map((w) => (
        <div
          key={w.slug}
          className="border border-slate-200 rounded-xl overflow-hidden flex flex-col"
        >
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">{w.label}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{w.description}</p>
          </div>
          <div className="px-5 py-4 bg-slate-900 flex-1">
            <code className="text-xs text-emerald-400 font-mono break-all select-all">
              {snippetFor(w.slug)}
            </code>
          </div>
          <button
            type="button"
            onClick={() => copy(w.slug)}
            className="px-5 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 border-t border-slate-200 transition-colors"
          >
            {copied === w.slug ? "Copied!" : "Copy snippet"}
          </button>
        </div>
      ))}
    </div>
  );
}
