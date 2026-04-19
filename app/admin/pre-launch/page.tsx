import AdminShell from "@/components/AdminShell";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEE_STALE_DAYS } from "@/lib/fee-freshness";

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

  // 7. Brokers with stale or missing fee verification
  try {
    const staleFeeCutoff = new Date(
      Date.now() - FEE_STALE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: staleOrMissing } = await supabase
      .from("brokers")
      .select("slug, name, fee_verified_date")
      .eq("status", "active")
      .or(`fee_verified_date.is.null,fee_verified_date.lt.${staleFeeCutoff}`)
      .limit(200);
    const count = staleOrMissing?.length || 0;
    metrics.push({
      label: `Brokers with stale or missing fee verification (>${FEE_STALE_DAYS}d)`,
      count,
      severity: count > 5 ? "block" : count > 0 ? "warn" : "ok",
      description: `Active brokers whose fees have not been human-verified in the last ${FEE_STALE_DAYS} days (or never). Readers see a red "unverified" pill on these cards — the highest-impact trust drag on the site.`,
      fixHref: "/admin/fee-queue",
      sample: (staleOrMissing || []).slice(0, 5).map((b) => b.slug),
    });
  } catch {
    metrics.push({
      label: "Brokers with stale fee verification",
      count: -1,
      severity: "warn",
      description: "Query failed.",
    });
  }

  return metrics;
}

/* ─── V2: deployment & environment checks ─── */

interface EnvCheck {
  key: string;
  required: boolean;
  present: boolean;
  note: string;
}

function checkEnv(): EnvCheck[] {
  const vars: Array<Omit<EnvCheck, "present">> = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", required: true, note: "Supabase project URL — public, required for all client DB reads." },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: true, note: "Supabase anon key — required for all client DB reads." },
    { key: "SUPABASE_SERVICE_ROLE_KEY", required: true, note: "Server-side admin client. Required for cron jobs, admin portal." },
    { key: "NEXT_PUBLIC_SITE_URL", required: true, note: "Canonical site URL used in absoluteUrl() and sitemap." },
    { key: "ANTHROPIC_API_KEY", required: true, note: "Powers the concierge chat + content ops scripts." },
    { key: "RESEND_API_KEY", required: true, note: "Transactional email (newsletters, advisor claims, concierge digests)." },
    { key: "STRIPE_SECRET_KEY", required: false, note: "Sponsor billing + advisor subscription — optional for soft launch." },
    { key: "STRIPE_WEBHOOK_SECRET", required: false, note: "Stripe webhook verification. Required if STRIPE_SECRET_KEY is set." },
    { key: "NEXT_PUBLIC_SENTRY_DSN", required: false, note: "Client-side Sentry error reporting." },
    { key: "SENTRY_AUTH_TOKEN", required: false, note: "Sentry source-map upload at build time." },
    { key: "CRON_SECRET", required: true, note: "Authenticates scheduled Vercel cron jobs." },
  ];
  return vars.map((v) => ({
    ...v,
    present: Boolean(process.env[v.key] && process.env[v.key]!.trim()),
  }));
}

interface UrlCheck {
  path: string;
  status: number | null;
  ok: boolean;
  note: string;
}

async function checkCriticalUrls(): Promise<UrlCheck[]> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://invest.com.au";

  const paths: Array<{ path: string; note: string }> = [
    { path: "/", note: "Homepage" },
    { path: "/sitemap.xml", note: "Sitemap index — Google crawls this first" },
    { path: "/robots.txt", note: "Robots directives" },
    { path: "/compare", note: "Broker comparison hub" },
    { path: "/best/low-fees", note: "Best-for category template" },
    { path: "/api/health", note: "Application health endpoint" },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const results = await Promise.all(
      paths.map(async (p) => {
        try {
          const r = await fetch(`${base}${p.path}`, {
            method: "GET",
            redirect: "manual",
            cache: "no-store",
            signal: controller.signal,
          });
          const ok = r.status >= 200 && r.status < 400;
          return { path: p.path, status: r.status, ok, note: p.note };
        } catch {
          return { path: p.path, status: null, ok: false, note: p.note };
        }
      }),
    );
    return results;
  } finally {
    clearTimeout(timer);
  }
}

export default async function AdminPreLaunchPage() {
  const metrics = await gatherMetrics();
  const envChecks = checkEnv();
  const urlChecks = await checkCriticalUrls();
  const blockers = metrics.filter((m) => m.severity === "block").length;
  const warnings = metrics.filter((m) => m.severity === "warn").length;
  const missingRequiredEnv = envChecks.filter(
    (e) => e.required && !e.present,
  ).length;
  const urlFailures = urlChecks.filter((u) => !u.ok).length;

  const overallSeverity: Metric["severity"] =
    blockers > 0 || missingRequiredEnv > 0 || urlFailures > 0
      ? "block"
      : warnings > 2
        ? "warn"
        : "ok";

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
              ? `${blockers + missingRequiredEnv + urlFailures} blocker(s) detected — address before hard launch`
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

        {/* Environment variables */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
              Environment variables
            </h2>
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                missingRequiredEnv > 0
                  ? "bg-rose-100 text-rose-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {missingRequiredEnv > 0
                ? `${missingRequiredEnv} missing`
                : "All required present"}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {envChecks.map((e) => (
              <div
                key={e.key}
                className="py-2 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-slate-900">
                      {e.key}
                    </code>
                    {e.required && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                        required
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl">
                    {e.note}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                    e.present
                      ? "bg-emerald-50 text-emerald-800"
                      : e.required
                        ? "bg-rose-50 text-rose-800"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {e.present ? "Set" : e.required ? "Missing" : "Not set"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Critical URL checks */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-700">
              Critical URL reachability
            </h2>
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                urlFailures > 0
                  ? "bg-rose-100 text-rose-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {urlFailures > 0
                ? `${urlFailures} failing`
                : "All reachable"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            GETs each path against{" "}
            <code className="bg-slate-50 px-1 rounded">
              NEXT_PUBLIC_SITE_URL
            </code>{" "}
            with a 4s timeout. 3xx redirects count as OK. A failure here likely
            means Vercel is down, DNS is misconfigured, or the route is
            broken.
          </p>
          <div className="divide-y divide-slate-100">
            {urlChecks.map((u) => (
              <div
                key={u.path}
                className="py-2 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <code className="text-xs font-mono text-slate-900 truncate block">
                    {u.path}
                  </code>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {u.note}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                    u.ok
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-rose-50 text-rose-800"
                  }`}
                >
                  {u.status == null ? "Timeout" : u.status}
                </span>
              </div>
            ))}
          </div>
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
