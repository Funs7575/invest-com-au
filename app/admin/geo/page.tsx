import AdminShell from "@/components/AdminShell";
import { listAiReferrerSources, listAiCrawlers } from "@/lib/geo/ai-referrer";

export const dynamic = "force-dynamic";

/**
 * GEO / AI-traffic measurement page. Renders what we detect (from the
 * classifier, the single source of truth) plus how to read the live numbers.
 * The detection coverage is live; the live counts live in PostHog (the
 * `ai_referral` event), with the HogQL below as a ready-made insight.
 */

const HOGQL_QUERY = `SELECT
  properties.source AS ai_source,
  properties.kind   AS kind,
  count()           AS visits
FROM events
WHERE event = 'ai_referral'
  AND timestamp > now() - INTERVAL 30 DAY
GROUP BY ai_source, kind
ORDER BY visits DESC`;

export default function GeoMeasurementPage() {
  const sources = listAiReferrerSources();
  const crawlers = listAiCrawlers();

  return (
    <AdminShell
      title="GEO / AI Traffic"
      subtitle="Whether generative-AI engines cite us and send traffic"
    >
      <div className="p-6">
      <p className="mb-6 max-w-3xl text-sm text-gray-600">
        Measures whether generative-AI engines send us traffic. When a visitor
        arrives from an AI assistant or answer engine we capture an{" "}
        <code className="rounded bg-gray-100 px-1">ai_referral</code> event
        (consent-gated, once per session). Plain Google and Bing are deliberately
        excluded — AI Overviews and Bing chat share the ordinary search hostname,
        so they can&apos;t be told apart from a blue-link click by referrer alone;
        those are measured via the Search Console impressions-vs-clicks gap (see
        roadmap).
      </p>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">
          AI referrers we detect ({sources.length})
        </h2>
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="min-w-full text-sm" aria-label="AI referrer sources">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Event key</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.source} className="border-t border-gray-100">
                  <td className="px-3 py-2">{s.label}</td>
                  <td className="px-3 py-2 text-gray-600">{s.vendor}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {s.kind === "assistant" ? "Assistant" : "Answer engine"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{s.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">
          AI crawlers we can detect ({crawlers.length})
        </h2>
        <p className="mb-2 max-w-3xl text-sm text-gray-600">
          User-Agent tokens for AI vendor bots. The detection table is wired;
          server-side crawler capture (in{" "}
          <code className="rounded bg-gray-100 px-1">proxy.ts</code>) is the next
          step — see roadmap.
        </p>
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="min-w-full text-sm" aria-label="AI crawler bots">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Bot</th>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {crawlers.map((c) => (
                <tr key={c.bot} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs">{c.bot}</td>
                  <td className="px-3 py-2 text-gray-600">{c.vendor}</td>
                  <td className="px-3 py-2 text-gray-600">{c.purpose.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">See live numbers in PostHog</h2>
        <p className="mb-2 max-w-3xl text-sm text-gray-600">
          The <code className="rounded bg-gray-100 px-1">ai_referral</code> event
          carries <code className="rounded bg-gray-100 px-1">source</code>,{" "}
          <code className="rounded bg-gray-100 px-1">vendor</code>,{" "}
          <code className="rounded bg-gray-100 px-1">kind</code> and{" "}
          <code className="rounded bg-gray-100 px-1">landing_path</code>. Paste
          this HogQL into a PostHog insight for a 30-day breakdown:
        </p>
        <pre className="overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
          <code>{HOGQL_QUERY}</code>
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Roadmap</h2>
        <ul className="ml-5 list-disc space-y-1 text-sm text-gray-600">
          <li>
            Server-side crawler capture in{" "}
            <code className="rounded bg-gray-100 px-1">proxy.ts</code> (fire-and-forget
            edge event) — a Tier-C change, needs founder sign-off.
          </li>
          <li>
            Search Console ingestion to measure the AI-Overview
            impressions-vs-clicks gap (the part referrers can&apos;t see).
          </li>
          <li>
            Optional: persist <code className="rounded bg-gray-100 px-1">ai_referral</code>{" "}
            to a Supabase table for in-app charts — deferred until the existing
            Supabase types-drift check is green, to avoid compounding it.
          </li>
        </ul>
      </section>
      </div>
    </AdminShell>
  );
}
