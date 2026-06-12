"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

type GlossaryEntry = { term: string; definition: string; category?: string; related?: string[] };

export default function GlossarySearch({ entries }: { entries: GlossaryEntry[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim().length > 1
    ? entries.filter(e =>
        e.term.toLowerCase().includes(query.toLowerCase()) ||
        e.definition.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const hasQuery = query.trim().length > 1;

  return (
    <div className="mb-6">
      <div className="relative mb-3">
        <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search terms..."
          aria-label="Search glossary terms"
          aria-controls="glossary-results"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
        />
      </div>
      <div id="glossary-results" aria-live="polite" aria-atomic="true">
        {hasQuery && filtered.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">No terms match &ldquo;{query}&rdquo;</p>
        )}
        {hasQuery && filtered.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
            {filtered.slice(0, 20).map(entry => (
              <div key={entry.term} className="bg-white border border-slate-200 rounded-lg p-3">
                <h3 className="text-sm font-bold text-slate-900">{entry.term}</h3>
                <p className="text-xs text-slate-600 mt-1">{entry.definition}</p>
                {entry.category && <span className="inline-block mt-1.5 text-[0.56rem] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{entry.category}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
