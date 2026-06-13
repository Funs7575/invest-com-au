"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import type { AdvisorEmbedSnippet } from "@/lib/widget/advisor-embed";
import { ADVISOR_EMBED_THEMES, type AdvisorEmbedTheme } from "@/lib/widget/advisor-embed";

/**
 * "Embed Kit" portal panel — the self-serve home for the three per-adviser
 * embeds (rating badge, reviews carousel, booking button) an adviser pastes
 * onto their OWN website. Each links back to their invest.com.au profile
 * (dofollow), so the kit doubles as a backlink/attribution play.
 *
 * Lives on its own portal tab (not the existing "Widgets" tab, which serves
 * the cross-site broker-comparison publisher widgets — a different audience
 * and purpose). A dedicated tab keeps the two from being conflated.
 *
 * The token is minted server-side by /api/advisor-portal/embed-kit and is
 * never derivable on the client. "Regenerate" mints a fresh token; the snippet
 * must then be re-copied onto the adviser's site.
 */

type KitResponse = {
  configured: boolean;
  slug?: string;
  active?: boolean;
  token?: string;
  snippets?: AdvisorEmbedSnippet[];
  error?: string;
};

type Variant = "script" | "iframe";

export default function EmbedKitTab() {
  const [loading, setLoading] = useState(true);
  const [kit, setKit] = useState<KitResponse | null>(null);
  const [theme, setTheme] = useState<AdvisorEmbedTheme>("light");
  const [activeType, setActiveType] = useState<string>("badge");
  const [variant, setVariant] = useState<Variant>("script");
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const load = useCallback(async (selectedTheme: AdvisorEmbedTheme) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/advisor-portal/embed-kit?theme=${encodeURIComponent(selectedTheme)}`,
      );
      const data = (await res.json()) as KitResponse;
      setKit(data);
    } catch {
      setKit({ configured: false, error: "Could not load your embed kit. Please try again." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The mint route bakes the theme into the snippet URLs, so a theme change
  // re-fetches to regenerate the snippet strings (the token stays the same).
  const onThemeChange = (t: AdvisorEmbedTheme) => {
    setTheme(t);
    void load(t);
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch("/api/advisor-portal/embed-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true, theme }),
      });
      const data = (await res.json()) as KitResponse;
      // The POST snippets are built with the default theme; re-load with the
      // selected theme so the preview/snippets reflect the current choice.
      if (data.configured) {
        await load(theme);
      } else {
        setKit(data);
      }
      setConfirmRegen(false);
    } catch {
      // Leave existing kit in place on failure.
    } finally {
      setRegenerating(false);
    }
  };

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-24 bg-slate-100 rounded-xl" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!kit?.configured) {
    return (
      <div className="space-y-4">
        <Heading />
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <Icon name="info" size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Embed kit unavailable</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {kit?.error ??
                "The embed kit isn't enabled on this environment yet. Please check back soon."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const snippets = kit.snippets ?? [];
  const selected = snippets.find((s) => s.type === activeType) ?? snippets[0];

  return (
    <div className="space-y-6">
      <Heading />

      {/* Inactive-profile notice — embeds render nothing until the listing is live. */}
      {kit.active === false && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2.5">
          <Icon name="info" size={15} className="text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            Your listing isn&apos;t live yet, so these embeds won&apos;t display on your site until
            your profile is approved. You can still copy the snippets now so they&apos;re ready to go.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Controls + embed picker ── */}
        <div className="space-y-4">
          {/* Embed type */}
          <fieldset>
            <legend className="block text-xs font-semibold text-slate-700 mb-1.5">Embed</legend>
            <div className="grid grid-cols-1 gap-2">
              {snippets.map((s) => (
                <label
                  key={s.type}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    activeType === s.type
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="embed-type"
                    value={s.type}
                    checked={activeType === s.type}
                    onChange={() => setActiveType(s.type)}
                    className="mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-none">{s.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Theme */}
          <div>
            <span id="embed-theme-label" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Theme
            </span>
            <div role="group" aria-labelledby="embed-theme-label" className="flex gap-2">
              {ADVISOR_EMBED_THEMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={theme === t}
                  onClick={() => onThemeChange(t)}
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
            <p className="text-[0.62rem] text-slate-500 mt-1">
              &quot;Auto&quot; follows each visitor&apos;s light/dark preference.
            </p>
          </div>

          {/* Snippet variant */}
          <div>
            <span id="embed-variant-label" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Snippet type
            </span>
            <div role="group" aria-labelledby="embed-variant-label" className="flex gap-2">
              {(["script", "iframe"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={variant === v}
                  onClick={() => setVariant(v)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    variant === v
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {v === "script" ? "Script (recommended)" : "iFrame"}
                </button>
              ))}
            </div>
            <p className="text-[0.62rem] text-slate-500 mt-1">
              {variant === "script"
                ? "Sizes itself to your content. Use this unless your site builder strips <script> tags."
                : "Use this if your page builder (e.g. some Wix/Squarespace blocks) removes <script> tags."}
            </p>
          </div>

          {/* Live preview */}
          {selected && (
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Icon name="eye" size={13} /> Live preview
              </span>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex justify-center">
                <iframe
                  key={selected.previewUrl}
                  src={selected.previewUrl}
                  title={`${selected.label} preview`}
                  loading="lazy"
                  className="w-full max-w-[420px]"
                  style={{ border: 0, height: previewHeight(selected.type) }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Snippet + instructions ── */}
        <div className="space-y-4">
          {selected && (
            <>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-3">
                  <span className="text-xs font-semibold text-slate-700">
                    {variant === "script" ? "Script embed code" : "iFrame embed code"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copy(
                        `${selected.type}-${variant}`,
                        variant === "script" ? selected.scriptHtml : selected.iframeHtml,
                      )
                    }
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      copied === `${selected.type}-${variant}`
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-900 text-white hover:bg-slate-700"
                    }`}
                  >
                    <Icon name={copied === `${selected.type}-${variant}` ? "check" : "copy"} size={13} />
                    {copied === `${selected.type}-${variant}` ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-[0.68rem] text-slate-700 bg-white overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                  {variant === "script" ? selected.scriptHtml : selected.iframeHtml}
                </pre>
              </div>

              {/* Install instructions — plain English */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-1.5">
                <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                  <Icon name="info" size={13} /> How to install
                </p>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal pl-4">
                  <li>Click <strong>Copy</strong> above.</li>
                  <li>
                    Open your website editor and find the page or section where you want the{" "}
                    {selected.label.toLowerCase()} to appear.
                  </li>
                  <li>
                    Paste the code into an <strong>HTML / embed / code block</strong> (most site
                    builders have one), then publish.
                  </li>
                  <li>
                    That&apos;s it — it updates automatically as your{" "}
                    {selected.type === "reviews"
                      ? "reviews are approved"
                      : selected.type === "badge"
                        ? "rating changes"
                        : "booking details change"}
                    . No maintenance needed.
                  </li>
                </ol>
              </div>

              {/* Trust / SEO note */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex items-start gap-2.5">
                <Icon name="shield" size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[0.7rem] text-emerald-800">
                  Each embed links back to your invest.com.au profile, helping visitors verify you
                  and reinforcing your search presence.
                </p>
              </div>
            </>
          )}

          {/* Regenerate / revoke */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-2.5">
              <Icon name="key" size={14} className="text-slate-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800">Embed security key</p>
                <p className="text-[0.7rem] text-slate-500 mt-0.5">
                  Regenerate if you ever need a fresh code. After regenerating, re-copy and re-paste
                  the snippet on your site so it keeps showing.
                </p>
              </div>
            </div>
            {!confirmRegen ? (
              <button
                type="button"
                onClick={() => setConfirmRegen(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <Icon name="shuffle" size={13} /> Regenerate code
              </button>
            ) : (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[0.7rem] text-slate-600">
                  This replaces your current snippet. Continue?
                </span>
                <button
                  type="button"
                  onClick={regenerate}
                  disabled={regenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-700 disabled:opacity-60"
                >
                  {regenerating ? "Regenerating…" : "Yes, regenerate"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRegen(false)}
                  disabled={regenerating}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900">Embed Kit</h2>
      <p className="text-sm text-slate-500 mt-1">
        Add your invest.com.au rating, reviews, or a booking button to your own website. Copy a
        snippet, paste it on your site, and it stays in sync automatically.
      </p>
    </div>
  );
}

/** Preview-iframe heights, matched to the served iframe defaults per type. */
function previewHeight(type: string): number {
  if (type === "reviews") return 312;
  if (type === "book") return 88;
  return 76; // badge
}
