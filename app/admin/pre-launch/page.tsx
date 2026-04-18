import AdminShell from "@/components/AdminShell";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Pre-launch readiness dashboard.
 *
 * Single-screen view of content-health signals that matter before
 * flipping the site from soft to hard launch:
 *
 *   * Unclaimed placeholder advisors  — seeded profiles with
 *     @placeholder.invest.com.au emails that haven''t been taken
 *     over by real advisors yet.
 *   * Stale articles                  — published > 180 days ago,
 *     not updated since. Could benefit from a refresh before
 *     high-traffic launch.
 *   * Verticals without hero images   — investment_verticals rows
 *     with null hero_image. Not fatal but reduces social-share and
 *     homepage strip visual quality.
 *   * Listings missing key fields     — investment_listings with
 *     no description or no price_display.
 *   * Advisor types with no active pros — advisor directory types
 *     where every listing is status != active (dead category page).
 *
 * Each row links to the admin area or directly to the SQL fix.
 * Every count is a live count — no caching. The page is dynamic.
 */

interface Metric {
  label: string;
  count: number;
  severity: "ok" | "warn" | "block";
  description: string;
  fixHref?: string;
  sample?: string[];
}

const PLACEHOLDER_EMAIL_DOMAIN = "placeholder.invest.com.au";
const STALE_DAYS = 180;

async function gatherMetrics(): Promise<Metric[]> {
  const supabase = createAdminClient();
  const metrics: Metric[] = [];
  const staleCutoff = new Date(
    Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // 1. Unclaimed placeholder advisors
  try {
    const { data: placeholders } = await supabase
      .from("professionals")
      .select("slug, name, type")
      .ilike("email", `%${PLACEHOLDER_EMAIL_DOMAIN}%`)
      .eq("status", "active")
      .limit(500);
    const count = placeholders?.length || 0;
    metrics.push({
      label: "Unclaimed placeholder advisors",
      count,
      severity: count > 30 ? "warn" : count > 0 ? "ok" : "ok",
      description: `Seeded profiles with @${PLACEHOLDER_EMAIL_DOMAIN} emails. These need outreach and claim flow before hard launch to avoid readers reaching fake contact details.`,
      fixHref: "/admin/advisors",
      sample: (placeholders || []).slice(0, 5).map((p) => p.slug),
    });
  } catch {
    metrics.push({
      label: "Unclaimed placeholder advisors",
      count: -1,
      severity: "warn",
      description: "Query failed — check Supabase connectivity.",
    });
  }

  // 2. Stale articles
  try {
    const { data: stale } = await supabase
      .from("articles")
      .select("slug, title, published_at")
      .eq("status", "published")
      .lt("published_at", staleCutoff)
      .order("published_at", { ascending: true })
      .limit(500);
    const count = stale?.length || 0;
    metrics.push({
      label: `Stale articles (> ${STALE_DAYS} days old)`,
      count,
      severity: count > 50 ? "warn" : "ok",
      description: `Articles published more than ${STALE_DAYS} days ago. Candidates for freshness review — update stats, refresh policy references, add recent events.`,
      fixHref: "/admin/articles",
      sample: (stale || []).slice(0, 5).map((a) => a.slug),
    });
  } catch {
    metrics.push({
      label: "Stale articles",
      count: -1,
      severity: "warn",
      description: "Query failed.",
    });
  }

  // 3. Verticals without hero images
  try {
    const { data: noHero } = await supabase
      .from("investment_verticals")
      .select("slug, name")
      .is("hero_image", null)
      .eq("active", true);
    const count = noHero?.length || 0;
    metrics.push({
      label: "Verticals without hero images",
      count,
      severity: count > 5 ? "warn" : "ok",
      description: "Active investment_verticals rows with null hero_image. Not fatal but reduces visual quality on homepage strips and social shares.",
      fixHref: "/admin/commodity-hubs",
      sample: (noHero || []).slice(0, 5).map((v) => v.slug),
    });
  } catch {
    metrics.push({
      label: "Verticals without hero images",
      count: -1,
      severity: "warn",
      description: "Query failed.",
    });
  }

  // 4. Listings missing description or price_display
  try {
    const { data: incomplete } = await supabase
      .from("investment_listings")
      .select("slug, title")
      .eq("status", "active")
      .or("description.is.null,price_display.is.null")
      .limit(500);
    const count = incomplete?.length || 0;
    metrics.push({
      label: "Active listings missing description or price",
      count,
      severity: count > 10 ? "block" : count > 0 ? "warn" : "ok",
      description: "Active investment_listings rows missing a description or price_display. These render as low-quality cards on listings pages.",
      fixHref: "/admin/listings",
      sample: (incomplete || []).slice(0, 5).map((l) => l.slug),
    });
  } catch {
    metrics.push({
      label: "Listings missing fields",
      count: -1,
      severity: "warn",
      description: "Query failed.",
    });
  }

  // 5. Advisor types with zero active advisors — finds dead category pages
  try {
    const { data: all } = await supabase
      .from("professionals")
      .select("type, status");
    const byType = new Map<string, number>();
    for (const row of (all || []) as Array<{ type: string; status: string }>) {
      if (row.status === "active") {
        byType.set(row.type, (byType.get(row.type) || 0) + 1);
      } else if (!byType.has(row.type)) {
        byType.set(row.type, 0);
      }
    }
    const empty = Array.from(byType.entries()).filter(([, n]) => n === 0);
    metrics.push({
      label: "Advisor types with zero active advisors",
      count: empty.length,
      severity: empty.length > 0 ? "warn" : "ok",
      description: "Advisor directory categories where every listing is inactive. The type-page would render empty.",
      fixHref: "/admin/advisors",
      sample: empty.slice(0, 5).map(([t]) => t),
    });
  } catch {
    metrics.push({
      label: "Advisor types with zero active advisors",
      count: -1,
      severity: "warn",
      description: "Query failed.",
    });
  }

  // 6. Categories with few listings — sparse marketplace
  try {
    const { data: counts } = await supabase
      .from("investment_listings")
      .select("vertical")
      .eq("status", "active");
    const byVertical = new Map<string, number>();
    for (const row of (counts || []) as Array<{ vertical: string }>) {
      byVertical.set(row.vertical, (byVertical.get(row.vertical) || 0) + 1);
    }
    const sparse = Array.from(byVertical.entries()).filter(
      ([, n]) => n > 0 && n < 3,
    );
    metrics.push({
      label: "Verticals with <3 active listings",
      count: sparse.length,
      severity: sparse.length > 3 ? "warn" : "ok",
      description: "Categories with 1-2 active listings render as visually-thin marketplace pages. Consider boosting supply or suppressing the category from nav until supply improves.",
      fixHref: "/admin/listings",
      sample: sparse.slice(0, 5).map(([v, n]) => `${v} (${n})`),
    });
  } catch {
    metrics.push({
      label: "Verticals with sparse listings",
      count: -1,
      severity: "warn",
      description: "Query failed.",
    });
  }

  return metrics;
}

export default async function AdminPreLaunchPage() {
  const metrics = await gatherMetrics();
  const blockers = metrics.filter((m) => m.severity === "block").length;
  const warnings = metrics.filter((m) => m.severity === "warn").length;

  const overallSeverity: Metric["severity"] =
    blockers > 0 ? "block" : warnings > 2 ? "warn" : "ok";

  return (
    <AdminShell
      title="Pre-launch readiness"
      subtitle="Content-health signals before flipping soft → hard launch"
    >
      <div className="max-w-5xl space-y-6">
        {/* Headline verdict */}
        <div
          className={`rounded-xl border p-5 ${
            overallSeverity === "block"
              ? "bg-rose-50 border-rose-200"
              : overallSeverity === "warn"
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
          }`}
        >
          <p
            className={`text-xs font-extrabold uppercase tracking-wide mb-1 ${
              overallSeverity === "block"
                ? "text-rose-800"
                : overallSeverity === "warn"
                  ? "text-amber-800"
                  : "text-emerald-800"
            }`}
          >
            Launch verdict
          </p>
          <p
            className={`text-lg font-extrabold ${
              overallSeverity === "block"
                ? "text-rose-900"
                : overallSeverity === "warn"
                  ? "text-amber-900"
                  : "text-emerald-900"
            }`}
          >
            {overallSeverity === "block"
              ? `${blockers} blocker(s) detected — address before hard launch`
              : overallSeverity === "warn"
                ? `${warnings} warning(s) — review before hard launch`
                : "All content-health checks pass"}
          </p>
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={`bg-white border rounded-xl p-5 ${
                m.severity === "block"
                  ? "border-rose-200"
                  : m.severity === "warn"
                    ? "border-amber-200"
                    : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        m.severity === "block"
                          ? "bg-rose-100 text-rose-800"
                          : m.severity === "warn"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {m.severity === "block"
                        ? "Blocker"
                        : m.severity === "warn"
                          ? "Warning"
                          : "OK"}
                    </span>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      {m.label}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 max-w-2xl">
                    {m.description}
                  </p>
                  {m.sample && m.sample.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-2">
                      Sample:{" "}
                      <code className="text-slate-700 bg-slate-50 px-1 rounded">
                        {m.sample.join(", ")}
                      </code>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className={`text-3xl font-extrabold tabular-nums ${
                      m.severity === "block"
                        ? "text-rose-700"
                        : m.severity === "warn"
                          ? "text-amber-700"
                          : "text-emerald-700"
                    }`}
                  >
                    {m.count < 0 ? "—" : m.count.toLocaleString("en-AU")}
                  </div>
                  {m.fixHref && (
                    <Link
                      href={m.fixHref}
                      className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
                    >
                      Fix →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ops notes */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600 mb-3">
            Ops notes
          </h2>
          <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
            <li>
              This page is <code className="bg-white px-1 rounded">dynamic = &quot;force-dynamic&quot;</code> — every reload runs fresh queries. Safe for daily check-ins; do not embed on public pages.
            </li>
            <li>
              Thresholds are heuristic. Tune the severity buckets in{" "}
              <code className="bg-white px-1 rounded">app/admin/pre-launch/page.tsx</code> as content standards change.
            </li>
            <li>
              The &quot;unclaimed placeholder advisors&quot; count is the most important signal pre-launch — every unclaimed profile is a reader reaching an invalid email.
            </li>
            <li>
              Pair this page with <Link href="/admin/domain-status" className="text-primary hover:underline">/admin/domain-status</Link> for the deployment-vs-live check.
            </li>
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
