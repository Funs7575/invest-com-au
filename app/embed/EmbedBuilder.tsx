"use client";

import { useState, useMemo, useEffect, useRef } from "react";

import {
  WIDGET_CATALOGUE,
  CALCULATOR_WIDGET_CATALOGUE,
  SUITE_WIDGET_CATALOGUE,
  AU_STATES,
  ADVISOR_TYPES,
  type WidgetKind,
} from "@/lib/widget/types";

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
  // ─── Tab ─────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<WidgetKind>("broker");

  // ─── Shared partner ref ──────────────────────────────────────────────────
  // Applied across all widget types so a publisher can set it once.
  const [partnerRef, setPartnerRef] = useState("");

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

  // ─── Advisor widget state ────────────────────────────────────────────────
  const [advisorType, setAdvisorType] = useState("");
  const [advisorState, setAdvisorState] = useState("");
  const [advisorTheme, setAdvisorTheme] = useState<"light" | "dark">("light");
  const [advisorLimit, setAdvisorLimit] = useState(5);

  // ─── Fee-index widget state ──────────────────────────────────────────────
  const [feeMarket, setFeeMarket] = useState<"asx" | "us">("asx");
  const [feeSort, setFeeSort] = useState<"asx_fee" | "us_fee" | "rating">("asx_fee");
  const [feeTheme, setFeeTheme] = useState<"light" | "dark">("light");
  const [feeLimit, setFeeLimit] = useState(10);

  // ─── Health-scores widget state ──────────────────────────────────────────
  const [healthSlugs, setHealthSlugs] = useState<string[]>([]);
  const [healthTheme, setHealthTheme] = useState<"light" | "dark">("light");
  const [healthLimit, setHealthLimit] = useState(5);

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
    if (partnerRef.trim()) params.set("ref", partnerRef.trim());
    const qs = params.toString();
    return `https://invest.com.au/api/widget${qs ? `?${qs}` : ""}`;
  }, [selectedSlugs, widgetType, brokerTheme, limit, widgetCatalogueSlug, partnerRef]);

  const calcEmbedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (calcMarket !== "asx") params.set("market", calcMarket);
    if (calcTheme !== "light") params.set("theme", calcTheme);
    if (calcLimit !== 5) params.set("limit", String(calcLimit));
    if (calcAmount !== 5000) params.set("amount", String(calcAmount));
    if (partnerRef.trim()) params.set("ref", partnerRef.trim());
    const qs = params.toString();
    return `https://invest.com.au/api/widget/calculator${qs ? `?${qs}` : ""}`;
  }, [calcMarket, calcTheme, calcLimit, calcAmount, partnerRef]);

  const advisorEmbedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (advisorType) params.set("type", advisorType);
    if (advisorState) params.set("state", advisorState);
    if (advisorTheme !== "light") params.set("theme", advisorTheme);
    if (advisorLimit !== 5) params.set("limit", String(advisorLimit));
    if (partnerRef.trim()) params.set("ref", partnerRef.trim());
    const qs = params.toString();
    return `https://invest.com.au/api/widget/advisors${qs ? `?${qs}` : ""}`;
  }, [advisorType, advisorState, advisorTheme, advisorLimit, partnerRef]);

  const feeIndexEmbedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (feeMarket !== "asx") params.set("market", feeMarket);
    if (feeSort !== "asx_fee") params.set("sort", feeSort);
    if (feeTheme !== "light") params.set("theme", feeTheme);
    if (feeLimit !== 10) params.set("limit", String(feeLimit));
    if (partnerRef.trim()) params.set("ref", partnerRef.trim());
    const qs = params.toString();
    return `https://invest.com.au/api/widget/fee-index${qs ? `?${qs}` : ""}`;
  }, [feeMarket, feeSort, feeTheme, feeLimit, partnerRef]);

  const healthEmbedUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (healthSlugs.length > 0) params.set("brokers", healthSlugs.join(","));
    if (healthTheme !== "light") params.set("theme", healthTheme);
    if (healthLimit !== 5) params.set("limit", String(healthLimit));
    if (partnerRef.trim()) params.set("ref", partnerRef.trim());
    const qs = params.toString();
    return `https://invest.com.au/api/widget/health-scores${qs ? `?${qs}` : ""}`;
  }, [healthSlugs, healthTheme, healthLimit, partnerRef]);

  const activeUrl = useMemo(() => {
    switch (tab) {
      case "broker": return brokerEmbedUrl;
      case "calculator": return calcEmbedUrl;
      case "advisors": return advisorEmbedUrl;
      case "fee-index": return feeIndexEmbedUrl;
      case "health-scores": return healthEmbedUrl;
    }
  }, [tab, brokerEmbedUrl, calcEmbedUrl, advisorEmbedUrl, feeIndexEmbedUrl, healthEmbedUrl]);

  const snippet = `<script src="${activeUrl}"></script>`;

  function toggleBroker(slug: string) {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function toggleHealthBroker(slug: string) {
    setHealthSlugs((prev) =>
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

  const activeTheme = ((): "light" | "dark" => {
    switch (tab) {
      case "broker": return brokerTheme;
      case "calculator": return calcTheme;
      case "advisors": return advisorTheme;
      case "fee-index": return feeTheme;
      case "health-scores": return healthTheme;
    }
  })();

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Tab bar — 5 widget types */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-none">
        {SUITE_WIDGET_CATALOGUE.map((w) => (
          <button
            key={w.kind}
            onClick={() => setTab(w.kind)}
            className={`flex-shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              tab === w.kind
                ? "bg-white text-emerald-700 border-b-2 border-emerald-600"
                : "bg-slate-50 text-slate-500 hover:text-slate-700"
            }`}
          >
            {w.label}
          </button>
        ))}
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

        {/* ── ADVISOR WIDGET CONTROLS ── */}
        {tab === "advisors" && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Advisor Type (optional)</label>
                <select
                  value={advisorType}
                  onChange={(e) => setAdvisorType(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="">All types</option>
                  {ADVISOR_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">State (optional)</label>
                <select
                  value={advisorState}
                  onChange={(e) => setAdvisorState(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="">All states</option>
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Theme</label>
                <select
                  value={advisorTheme}
                  onChange={(e) => setAdvisorTheme(e.target.value as "light" | "dark")}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Max Advisors</label>
                <select
                  value={advisorLimit}
                  onChange={(e) => setAdvisorLimit(parseInt(e.target.value, 10))}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  {[3, 5, 8, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Displays public advisor profiles — no personal data. General-advice disclaimer included automatically.
            </p>
          </>
        )}

        {/* ── FEE-INDEX WIDGET CONTROLS ── */}
        {tab === "fee-index" && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Market</label>
                <select
                  value={feeMarket}
                  onChange={(e) => setFeeMarket(e.target.value as "asx" | "us")}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="asx">ASX (Australian shares)</option>
                  <option value="us">US shares</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Sort by</label>
                <select
                  value={feeSort}
                  onChange={(e) => setFeeSort(e.target.value as "asx_fee" | "us_fee" | "rating")}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="asx_fee">ASX fee (cheapest first)</option>
                  <option value="us_fee">US fee (cheapest first)</option>
                  <option value="rating">Editorial rating</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Theme</label>
                <select
                  value={feeTheme}
                  onChange={(e) => setFeeTheme(e.target.value as "light" | "dark")}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Max Brokers</label>
                <select
                  value={feeLimit}
                  onChange={(e) => setFeeLimit(parseInt(e.target.value, 10))}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Displays factual, publicly disclosed broker fee schedules. Not financial advice.
            </p>
          </>
        )}

        {/* ── HEALTH-SCORES WIDGET CONTROLS ── */}
        {tab === "health-scores" && (
          <>
            {/* Broker selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Brokers (optional — leave blank for top by rating)
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_BROKERS.map((b) => {
                  const active = healthSlugs.includes(b.slug);
                  return (
                    <button
                      key={b.slug}
                      onClick={() => toggleHealthBroker(b.slug)}
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

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Theme</label>
                <select
                  value={healthTheme}
                  onChange={(e) => setHealthTheme(e.target.value as "light" | "dark")}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Max Brokers</label>
                <select
                  value={healthLimit}
                  onChange={(e) => setHealthLimit(parseInt(e.target.value, 10))}
                  className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm"
                >
                  {[3, 5, 8, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Scores are computed from factual regulatory attributes — not a personal recommendation.
              General-advice disclaimer is included automatically.
            </p>
          </>
        )}

        {/* ── Shared partner ref ── */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Partner ID <span className="text-slate-400 font-normal lowercase">(optional — adds ?ref= to outbound links)</span>
          </label>
          <input
            type="text"
            value={partnerRef}
            onChange={(e) => setPartnerRef(e.target.value)}
            placeholder="e.g. moneymag, yoursite"
            className="w-full border border-slate-200 rounded-lg py-2 px-3 text-sm placeholder:text-slate-400"
            maxLength={64}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Your ID is appended to all outbound invest.com.au links for affiliate attribution. No data is stored by the widget.
          </p>
        </div>

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
