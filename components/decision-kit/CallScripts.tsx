"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { CallScript } from "@/lib/decision-kit/scripts";

/**
 * Per-service intro-call question script — printable and copyable. The
 * questions are neutral, general educational prompts (not advice); each has a
 * short "why this matters" line.
 */

interface Props {
  script: CallScript;
}

function scriptToPlainText(script: CallScript): string {
  const lines = [
    `Intro-call questions — ${script.label}`,
    "",
    script.intro,
    "",
    ...script.questions.flatMap((q, i) => [
      `${i + 1}. ${q.question}`,
      `   Why: ${q.why}`,
      "",
    ]),
    "Questions to ask the advisers who responded to you. General information only — not financial advice.",
  ];
  return lines.join("\n");
}

export default function CallScripts({ script }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(scriptToPlainText(script));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="call-scripts-heading"
      className="rounded-2xl border border-slate-200 bg-white p-4 print:border-0 print:p-0"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3
            id="call-scripts-heading"
            className="text-base font-bold text-slate-900"
          >
            Questions for your intro calls
          </h3>
          <p className="text-xs text-slate-500">{script.label}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={copyAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Icon name={copied ? "check-circle" : "clipboard-list"} size={13} />
            {copied ? "Copied" : "Copy all"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Icon name="file-text" size={13} />
            Print
          </button>
        </div>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-slate-600">{script.intro}</p>

      <ol className="space-y-3">
        {script.questions.map((q, i) => (
          <li key={i} className="flex gap-3">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white print:bg-slate-300 print:text-slate-900"
              aria-hidden
            >
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{q.question}</p>
              <p className="mt-0.5 text-xs italic text-slate-500">
                Why it matters: {q.why}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
