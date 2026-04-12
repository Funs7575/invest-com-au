"use client";

import { useState, useMemo, useEffect, useRef } from "react";

const POPULAR_BROKERS = [
  { slug: "stake", name: "Stake" },
  { slug: "commsec", name: "CommSec" },
  { slug: "cmc-markets", name: "CMC Markets" },
  { slug: "selfwealth", name: "SelfWealth" },
  { slug: "moomoo", name: "Moomoo" },
  { slug: "interactive-brokers", name: "Interactive Brokers" },
  { slug: "superhero", name: "Superhero" },
  { slug: "nabtrade", name: "nabtrade" },
  { slug: "pearler", name: "Pearler" },
  { slug: "webull", name: "Webull" },
];

export default function EmbedBuilder() {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [widgetType, setWidgetType] = useState<"table" | "compact">("table");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [limit, setLimit] = useState(5);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedSlugs.length > 0) params.set("brokers", selectedSlugs.join(","));
    if (widgetType !== "table") params.set("type", widgetType);
    if (theme !== "light") params.set("theme", theme);
    if (limit !== 5) params.set("limit", String(limit));
    const qs = params.toString();
    return `https://invest.com.au/api/widget${qs ? `?${qs}` : ""}`;
  }, [selectedSlugs, widgetType, theme, limit]);

  const snippet = `<script src="${embedUrl}"></script>`;

  function toggleBroker(slug: string) {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = snippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Live preview: inject the script into an iframe for isolation
  useEffect(() => {
    if (!previewRef.current) return;
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.border = "none";
    iframe.style.minHeight = "200px";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    previewRef.current.innerHTML = "";
    previewRef.current.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style></head><body>${snippet}</body></html>`);
      doc.close();
    }

    // Auto-resize iframe
    const resizeObserver = new ResizeObserver(() => {
      if (iframe.contentDocument?.body) {
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 20 + "px";
      }
    });
    const timer = setTimeout(() => {
      if (iframe.contentDocument?.body) {
        resizeObserver.observe(iframe.contentDocument.body);
        iframe.style.height = iframe.contentDocument.body.scrollHeight + 20 + "px";
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [snippet]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-5 md:p-6 space-y-5">
        {/* Broker selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Select Brokers (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_BROKERS.map((b) => {
              const active = selectedSlugs.includes(b.slug);
              return (
                <button
                  key={b.slug}
                  onClick={() => toggleBroker(b.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    active
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {active && <span className="mr-1">&#10003;</span>}
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Layout + Theme */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Layout</label>
            <select
              value={widgetType}
              onChange={(e) => setWidgetType(e.target.value as "table" | "compact")}
              className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
            >
              <option value="table">Table</option>
              <option value="compact">Compact Cards</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark")}
              className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Max Brokers</label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
            >
              {[3, 5, 8, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Code output */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Your Embed Code</label>
          <div className="relative">
            <div className="bg-slate-900 rounded-lg p-4 pr-24">
              <code className="text-xs text-emerald-400 font-mono break-all">{snippet}</code>
            </div>
            <button
              onClick={copyToClipboard}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Live Preview</label>
          <div
            ref={previewRef}
            className={`rounded-lg border border-slate-200 overflow-hidden min-h-[200px] ${
              theme === "dark" ? "bg-slate-800" : "bg-white"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
