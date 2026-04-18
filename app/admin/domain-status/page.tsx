import AdminShell from "@/components/AdminShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIVE_DOMAIN = "https://invest.com.au";
const VERCEL_CANONICAL_HINT = "invest-com-au.vercel.app";

interface FetchResult {
  ok: boolean;
  status?: number;
  finalUrl?: string;
  title?: string | null;
  hasNoIndex?: boolean;
  xVercelId?: string | null;
  server?: string | null;
  bytes?: number;
  error?: string;
  fetchedAt: string;
}

async function fetchHead(url: string): Promise<FetchResult> {
  const fetchedAt = new Date().toISOString();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        // Identify ourselves honestly — some origins block default fetch UAs
        "User-Agent": "Mozilla/5.0 (compatible; invest.com.au-domain-check/1.0)",
      },
      // Never cache — this page is a live health probe
      cache: "no-store",
    });
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const robotsMatch = html.match(
      /<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i,
    );
    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      title: titleMatch ? titleMatch[1].trim() : null,
      hasNoIndex: robotsMatch ? /noindex/i.test(robotsMatch[1]) : false,
      xVercelId: res.headers.get("x-vercel-id"),
      server: res.headers.get("server"),
      bytes: html.length,
      fetchedAt,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      fetchedAt,
    };
  }
}

interface DeploymentRecord {
  id: string;
  url: string;
  state: string;
  createdAt: number;
}

async function fetchLatestVercelDeployment(): Promise<{
  deployment: DeploymentRecord | null;
  note: string;
}> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return {
      deployment: null,
      note:
        "VERCEL_API_TOKEN / VERCEL_PROJECT_ID not set in env — skipping Vercel lookup.",
    };
  }

  const url = new URL("https://api.vercel.com/v6/deployments");
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("limit", "1");
  url.searchParams.set("target", "production");
  if (teamId) url.searchParams.set("teamId", teamId);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { deployment: null, note: `Vercel API ${res.status}` };
    }
    const data = (await res.json()) as { deployments?: DeploymentRecord[] };
    const d = data.deployments?.[0] ?? null;
    return { deployment: d, note: d ? "ok" : "no deployments returned" };
  } catch (err) {
    return {
      deployment: null,
      note: err instanceof Error ? err.message : String(err),
    };
  }
}

export default async function AdminDomainStatusPage() {
  const [liveResult, deploymentInfo] = await Promise.all([
    fetchHead(LIVE_DOMAIN),
    fetchLatestVercelDeployment(),
  ]);

  // If Vercel API told us a deployment URL, probe it too so we can
  // diff against what invest.com.au is serving.
  const deploymentUrl = deploymentInfo.deployment
    ? `https://${deploymentInfo.deployment.url}`
    : null;
  const deploymentResult = deploymentUrl ? await fetchHead(deploymentUrl) : null;

  // Heuristic DNS mismatch flag:
  //   - live x-vercel-id missing OR server header not vercel-ish → not served from Vercel
  //   - live title differs from deployment title → serving stale/different content
  const liveServedByVercel = Boolean(
    liveResult.xVercelId || (liveResult.server && /vercel/i.test(liveResult.server)),
  );
  const titleMismatch =
    deploymentResult !== null &&
    liveResult.title !== null &&
    deploymentResult.title !== null &&
    liveResult.title !== deploymentResult.title;

  const dnsLikelyMismatched = !liveResult.ok || !liveServedByVercel;

  return (
    <AdminShell
      title="Domain status"
      subtitle="Live invest.com.au vs latest Vercel deployment"
    >
      <div className="max-w-4xl space-y-6">
        {/* Headline verdict */}
        <div
          className={`rounded-xl border p-5 ${
            dnsLikelyMismatched
              ? "bg-rose-50 border-rose-200"
              : titleMismatch
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
          }`}
        >
          <p
            className={`text-xs font-extrabold uppercase tracking-wide mb-1 ${
              dnsLikelyMismatched
                ? "text-rose-800"
                : titleMismatch
                  ? "text-amber-800"
                  : "text-emerald-800"
            }`}
          >
            Verdict
          </p>
          <p
            className={`text-lg font-extrabold ${
              dnsLikelyMismatched
                ? "text-rose-900"
                : titleMismatch
                  ? "text-amber-900"
                  : "text-emerald-900"
            }`}
          >
            {dnsLikelyMismatched
              ? "DNS likely mismatched — invest.com.au is NOT being served by Vercel"
              : titleMismatch
                ? "Serving from Vercel but content differs from latest deployment"
                : "Live domain matches latest Vercel deployment"}
          </p>
          <p className="text-sm text-slate-600 mt-2">
            {dnsLikelyMismatched
              ? "The live domain either failed to respond or returned without a Vercel server header. Check the A/AAAA or CNAME records with your registrar and the domain configuration in the Vercel project."
              : titleMismatch
                ? `Live title "${liveResult.title}" differs from latest-deployment title "${deploymentResult?.title}". This can mean DNS is pointed at a stale deployment, the ${VERCEL_CANONICAL_HINT} alias hasn't been promoted, or an ISR cache hasn't refreshed.`
                : "No obvious mismatch detected between invest.com.au and the latest production deployment."}
          </p>
        </div>

        {/* Live domain card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600 mb-3">
            Live domain · {LIVE_DOMAIN}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Row k="Status" v={liveResult.ok ? String(liveResult.status) : `ERROR — ${liveResult.error ?? liveResult.status}`} />
            <Row k="Final URL" v={liveResult.finalUrl ?? "—"} mono />
            <Row k="Title" v={liveResult.title ?? "—"} />
            <Row k="Robots noindex" v={liveResult.hasNoIndex ? "YES" : "no"} warn={liveResult.hasNoIndex} />
            <Row k="x-vercel-id" v={liveResult.xVercelId ?? "—"} mono />
            <Row k="server header" v={liveResult.server ?? "—"} mono />
            <Row k="bytes" v={liveResult.bytes !== undefined ? String(liveResult.bytes) : "—"} />
            <Row k="fetched at" v={liveResult.fetchedAt} mono />
          </dl>
        </div>

        {/* Latest deployment card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600 mb-3">
            Latest Vercel deployment
          </h2>
          {deploymentInfo.deployment ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Row k="Deployment ID" v={deploymentInfo.deployment.id} mono />
              <Row k="URL" v={deploymentUrl ?? "—"} mono />
              <Row k="State" v={deploymentInfo.deployment.state} />
              <Row
                k="Created"
                v={new Date(deploymentInfo.deployment.createdAt).toISOString()}
                mono
              />
              {deploymentResult && (
                <>
                  <Row
                    k="Probe status"
                    v={deploymentResult.ok ? String(deploymentResult.status) : `ERROR — ${deploymentResult.error ?? deploymentResult.status}`}
                  />
                  <Row k="Probe title" v={deploymentResult.title ?? "—"} />
                  <Row k="Probe x-vercel-id" v={deploymentResult.xVercelId ?? "—"} mono />
                </>
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">
              {deploymentInfo.note}
            </p>
          )}
        </div>

        {/* Ops notes */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-600 mb-3">
            Ops notes
          </h2>
          <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
            <li>
              This page is <code className="bg-white px-1 rounded">dynamic = &quot;force-dynamic&quot;</code> — every load issues a fresh probe. Do not link from public pages.
            </li>
            <li>
              Live-domain identification of Vercel is heuristic: we look for{" "}
              <code className="bg-white px-1 rounded">x-vercel-id</code> or a{" "}
              <code className="bg-white px-1 rounded">server</code> header containing &quot;vercel&quot;. A CDN in front of Vercel can mask both.
            </li>
            <li>
              To enable the deployment comparison, set{" "}
              <code className="bg-white px-1 rounded">VERCEL_API_TOKEN</code>,{" "}
              <code className="bg-white px-1 rounded">VERCEL_PROJECT_ID</code> and (if applicable){" "}
              <code className="bg-white px-1 rounded">VERCEL_TEAM_ID</code> in Vercel project env vars.
            </li>
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}

function Row({
  k,
  v,
  mono,
  warn,
}: {
  k: string;
  v: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">
        {k}
      </dt>
      <dd
        className={`text-slate-900 ${mono ? "font-mono text-xs break-all" : "text-sm"} ${warn ? "text-rose-700 font-bold" : ""}`}
      >
        {v}
      </dd>
    </div>
  );
}
