import { createClient } from "@/lib/supabase/server";
import type { RegulatoryAlert } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("regulatory_alerts").select("title, impact_summary").eq("slug", slug).eq("status", "published").single();
  if (!data) return { title: "Alert Not Found" };
  return {
    title: `${data.title} — ${SITE_NAME}`,
    description: data.impact_summary || `Regulatory alert: ${data.title}`,
    alternates: { canonical: `/alerts/${slug}` },
  };
}

export default async function AlertDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("regulatory_alerts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) notFound();
  const alert = data as RegulatoryAlert;

  const severityStyles: Record<string, string> = {
    info: "bg-blue-50 text-blue-700 border-blue-200",
    important: "bg-amber-50 text-amber-700 border-amber-200",
    urgent: "bg-red-50 text-red-700 border-red-200",
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Regulatory Alerts", url: absoluteUrl("/alerts") },
    { name: alert.title },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="py-12">
        <div className="container-custom max-w-2xl mx-auto">
          <div className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/alerts" className="hover:text-brand">Alerts</Link>
            <span className="mx-2">/</span>
            <span className="text-brand truncate">{alert.title}</span>
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${severityStyles[alert.severity] || severityStyles.info}`}>
              {alert.severity.toUpperCase()}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
              {alert.alert_type.toUpperCase()}
            </span>
            {alert.effective_date && (
              <span className="text-xs text-slate-400">
                Effective: {new Date(alert.effective_date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold mb-4">{alert.title}</h1>

          {alert.impact_summary && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <h2 className="text-sm font-bold text-amber-800 mb-1">Impact Summary</h2>
              <p className="text-sm text-amber-700">{alert.impact_summary}</p>
            </div>
          )}

          {alert.body && (
            <div className="prose prose-sm max-w-none mb-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{alert.body}</p>
            </div>
          )}

          {alert.action_items && alert.action_items.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-green-800 mb-2">Action Items</h3>
              <ul className="space-y-2">
                {alert.action_items.map((item, i) => (
                  <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                    <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                    <span>
                      {item.text}
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-green-800 hover:underline ml-1 font-medium">
                          Learn more →
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {alert.source_url && (
            <a href={alert.source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-green-700 hover:underline mb-6">
              Source: {alert.source_name || "View original"} →
            </a>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 mt-4">
            <strong>Disclaimer:</strong> {GENERAL_ADVICE_WARNING}
          </div>

          <div className="mt-6">
            <Link href="/alerts" className="text-sm text-green-700 hover:underline">← Back to all alerts</Link>
          </div>
        </div>
      </div>
    </>
  );
}
