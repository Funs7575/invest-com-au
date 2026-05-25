"use client";

import { useState, useMemo, useEffect, useRef } from "react";

import { WIDGET_CATALOGUE, CALCULATOR_WIDGET_CATALOGUE } from "@/lib/widget/types";

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

type BuilderTab = "broker" | "calculator";

export default function EmbedBuilder() {
  // ─── Tab ─────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<BuilderTab>("broker");

  // ─── Broker widget state ─────────────────────────────────────────────────
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [widgetType, setWidgetType] = useState<"table" | "compact">("table");
  const [brokerTheme, setBrokerTheme] = useState<"light" | "dark">("light");
  const [limit, setLimit] = useState(5);
  const [widgetCatalogueSlug, setWidgetCatalogueSlug] = useState<string>("");

  // ─── Calculator widget state ─────────────────────────────────────────────
  const [calcMarket, setCalcMarket] = useState<"asx" | "us">("asx");
  const [calcTheme, setCalcTheme] = useState<"light" | "dark">("light");
  const [calcLimit, setCalcLimit] = useState(5);
  const [calcAmount, setCalcAmount] = useState(5000);

  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // ─── Snippet generation ──────────────────────────────────────────────────
  const brokerEmbedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (widgetCatalogueSlug) params.set("widget", widgetCatalogueSlug);
    if (selectedSlugs.length > 0) params.set("brokers", selectedSlugs.join(","));
    if (widgetType !== "table") params.set("type", widgetType);
    if (brokerTheme !== "light") params.set("theme", brokerTheme);
    if (limit !== 5) params.set("limit", String(limit));
    const qs = params.toString();
    return `https://invest.com.au/api/widget${qs ? `?${qs}` : ""}`;
  }, [selectedSlugs, widgetType, brokerTheme, limit, widgetCatalogueSlug]);

  const calcEmbedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (calcMarket !== "asx") params.set("market", calcMarket);
    if (calcTheme !== "light") params.set("theme", calcTheme);
    if (calcLimit !== 5) params.set("limit", String(calcLimit));
    if (calcAmount !== 5000) params.set("amount", String(calcAmount));
    const qs = params.toString();
    return `https://invest.com.au/api/widget/calculator${qs ? `?${qs}` : ""}`;
  }, [calcMarket, calcTheme, calcLimit, calcAmount]);

  const activeUrl = tab === "broker" ? brokerEmbedUrl : calcEmbedUrl;
  const snippet = `<script src="${activeUrl}"></script>`;

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

  const activeTheme = tab === "broker" ? brokerTheme : calcTheme;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab("broker")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            tab === "broker"
              ? "bg-white text-emerald-700 border-b-2 border-emerald-600"
              : "bg-slate-50 text-slate-500 hover:text-slate-700"
          }`}
        >
          Broker Comparison
        </button>
        <button
          onClick={() => setTab("calculator")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            tab === "calculator"
              ? "bg-white text-emerald-700 border-b-2 border-emerald-600"
              : "bg-slate-50 text-slate-500 hover:text-slate-700"
          }`}
        >
          Fee Calculator
        </button>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        {/* ── BROKER WIDGET CONTROLS ── */}
        {tab === "broker" && (
          <>
            {/* Curated widget filter */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Widget type
              </label>
              <select
                value={widgetCatalogueSlug}
                onChange={(e) => setWidgetCatalogueSlug(e.target.value)}
                className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
              >
                <option value="">Top brokers (default)</option>
                {WIDGET_CATALOGUE.map((w) => (
                  <option key={w.slug} value={w.slug}>{w.label}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Pick a curated list (e.g. crypto exchanges) or leave default for top-rated overall.
              </p>
            </div>

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
                  value={brokerTheme}
                  onChange={(e) => setBrokerTheme(e.target.value as "light" | "dark")}
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
          </>
        )}

        {/* ── CALCULATOR WIDGET CONTROLS ── */}
        {tab === "calculator" && (
          <>
            {/* Preset picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Preset
              </label>
              <div className="grid sm:grid-cols-3 gap-3">
                {CALCULATOR_WIDGET_CATALOGUE.map((preset) => (
                  <button
                    key={preset.slug}
                    onClick={() => {
                      setCalcMarket(preset.market);
                      setCalcAmount(preset.amount);
                    }}
                    className="text-left border border-slate-200 rounded-lg p-3 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all"
                  >
                    <p className="text-xs font-bold text-slate-800 mb-0.5">{preset.label}</p>
                    <p className="text-[11px] text-slate-500 leading-snug">{preset.snippetHint}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Market + Amount + Theme + Limit */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Market</label>
                <select
                  value={calcMarket}
                  onChange={(e) => setCalcMarket(e.target.value as "asx" | "us")}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="asx">ASX (Australian shares)</option>
                  <option value="us">US shares (includes FX cost)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Default Amount (AUD)</label>
                <select
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(parseInt(e.target.value, 10))}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  {[500, 1000, 2000, 5000, 10000, 25000, 50000].map((n) => (
                    <option key={n} value={n}>${n.toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Theme</label>
                <select
                  value={calcTheme}
                  onChange={(e) => setCalcTheme(e.target.value as "light" | "dark")}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Max Brokers</label>
                <select
                  value={calcLimit}
                  onChange={(e) => setCalcLimit(parseInt(e.target.value, 10))}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  {[3, 5, 8, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              The calculator is interactive — visitors can change the trade amount and market directly in the widget.
              General-advice disclaimer is included automatically.
            </p>
          </>
        )}

        {/* Code output — shared */}
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

        {/* Live Preview — shared */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Live Preview</label>
          <div
            ref={previewRef}
            className={`rounded-lg border border-slate-200 overflow-hidden min-h-50 ${
              activeTheme === "dark" ? "bg-slate-800" : "bg-white"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
