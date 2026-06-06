"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { WIDGET_CATALOGUE } from "@/lib/widget/types";

const THEMES = ["light", "dark"] as const;
const TYPES = ["table", "compact"] as const;
const LIMITS = [3, 5, 10] as const;

type Theme = (typeof THEMES)[number];
type DisplayType = (typeof TYPES)[number];

export default function WidgetBuilderTab() {
  const [selectedSlug, setSelectedSlug] = useState(WIDGET_CATALOGUE[0]!.slug);
  const [theme, setTheme] = useState<Theme>("light");
  const [displayType, setDisplayType] = useState<DisplayType>("table");
  const [limit, setLimit] = useState<number>(5);
  const [copied, setCopied] = useState(false);

  const selectedWidget = WIDGET_CATALOGUE.find((w) => w.slug === selectedSlug)!;

  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://invest.com.au";

  const params = new URLSearchParams({
    widget: selectedSlug,
    theme,
    type: displayType,
    limit: String(limit),
  });

  const iframeUrl = `${siteUrl}/api/widget?${params.toString()}`;

  const embedCode = `<!-- ${selectedWidget.heading} widget by invest.com.au -->
<iframe
  src="${iframeUrl}"
  width="100%"
  height="${displayType === "compact" ? "320" : Math.max(300, limit * 60 + 80)}"
  style="border:none;border-radius:12px;"
  loading="lazy"
  title="${selectedWidget.heading}"
></iframe>`;

  const copy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">Widget Builder</h2>
        <p className="text-sm text-slate-500 mt-1">
          Embed a live comparison table on your website or blog — rates update automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Widget type */}
          <fieldset>
            <legend className="block text-xs font-semibold text-slate-700 mb-1.5">
              Comparison type
            </legend>
            <div className="grid grid-cols-1 gap-2">
              {WIDGET_CATALOGUE.map((entry) => (
                <label
                  key={entry.slug}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedSlug === entry.slug
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="widget-slug"
                    value={entry.slug}
                    checked={selectedSlug === entry.slug}
                    onChange={() => setSelectedSlug(entry.slug)}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-none">
                      {entry.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Theme */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Theme
            </label>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    theme === t
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Display type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Layout
            </label>
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDisplayType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    displayType === t
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rows to show
            </label>
            <div className="flex gap-2">
              {LIMITS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLimit(l)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    limit === l
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Embed code */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-3">
              <span className="text-xs font-semibold text-slate-700">Embed code</span>
              <button
                type="button"
                onClick={copy}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  copied
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-900 text-white hover:bg-slate-700"
                }`}
              >
                <Icon name={copied ? "check" : "copy"} size={13} />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="p-4 text-[0.68rem] text-slate-700 bg-white overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
              {embedCode}
            </pre>
          </div>

          {/* Preview link */}
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Icon name="external-link" size={13} />
            Preview widget in new tab
          </a>

          {/* Tips */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
              <Icon name="info" size={13} /> Usage tips
            </p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc pl-4">
              <li>Paste the embed code anywhere in your website HTML.</li>
              <li>Rates update automatically — no maintenance required.</li>
              <li>The widget is responsive and works on mobile.</li>
              <li>Attribution to invest.com.au is shown inside the widget.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
