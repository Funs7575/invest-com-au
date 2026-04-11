import { createClient } from "@/lib/supabase/server";
import type { RegulatoryAlert, RegulatoryBrokerImpact } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("regulatory_alerts").select("title, impact_summary").eq("slug", slug).eq("status", "published").single();
  if (!data) return { title: "Alert Not Found" };
  return {
    title: data.title,
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

  // Fetch broker impact assessments for this alert
  const { data: impacts } = await supabase
    .from("regulatory_broker_impacts")
    .select("*")
    .eq("alert_id", data.id)
    .order("impact_level", { ascending: false });

  const brokerImpacts = (impacts as RegulatoryBrokerImpact[]) || [];

  // Fetch broker names for the impacts
  const impactSlugs = brokerImpacts.map((i) => i.broker_slug);
  const { data: brokerData } = impactSlugs.length > 0
    ? await supabase.from("brokers").select("slug, name").in("slug", impactSlugs)
    : { data: [] };
  const brokerNames: Record<string, string> = {};
  (brokerData || []).forEach((b: { slug: string; name: string }) => { brokerNames[b.slug] = b.name; });

  // Increment view count
  await supabase.from("regulatory_alerts").update({ views_count: (alert.views_count || 0) + 1 }).eq("id", alert.id);

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
      <div className="py-5 md:py-12">
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
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Action Items</h3>
              <ul className="space-y-2">
                {alert.action_items.map((item, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                    <span>
                      {item.text}
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-slate-800 hover:underline ml-1 font-medium">
                          Learn more →
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Broker Impact Assessment */}
          {brokerImpacts.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-extrabold text-slate-900 mb-3">Broker Impact Assessment</h2>
              <p className="text-xs text-slate-500 mb-3">
                How this change affects Australian brokers and their customers.
              </p>
              <div className="space-y-3">
                {brokerImpacts.map((impact) => {
                  const levelStyles: Record<string, { bg: string; text: string; label: string }> = {
                    none: { bg: "bg-slate-100", text: "text-slate-600", label: "No Impact" },
                    low: { bg: "bg-blue-100", text: "text-blue-700", label: "Low" },
                    medium: { bg: "bg-amber-100", text: "text-amber-700", label: "Medium" },
                    high: { bg: "bg-orange-100", text: "text-orange-700", label: "High" },
                    critical: { bg: "bg-red-100", text: "text-red-700", label: "Critical" },
                  };
                  const style = levelStyles[impact.impact_level] || levelStyles.low;

                  return (
                    <div key={impact.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <Link href={`/broker/${impact.broker_slug}`} className="text-sm font-bold text-slate-900 hover:text-blue-700">
                          {brokerNames[impact.broker_slug] || impact.broker_slug}
                        </Link>
                        <span className={`text-[0.69rem] px-2 py-0.5 rounded-full font-bold ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{impact.impact_description}</p>
                      {impact.estimated_fee_change != null && impact.estimated_fee_change !== 0 && (
                        <div className={`text-xs font-semibold ${impact.estimated_fee_change > 0 ? "text-red-600" : "text-emerald-600"}`}>
                          Estimated fee impact: {impact.estimated_fee_change > 0 ? "+" : ""}${impact.estimated_fee_change.toFixed(2)}/trade
                        </div>
                      )}
                      {impact.broker_response && (
                        <div className="mt-2 bg-slate-50 rounded-lg p-3">
                          <div className="text-[0.69rem] font-semibold text-slate-500 mb-1">Broker Response</div>
                          <p className="text-xs text-slate-600">{impact.broker_response}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compliance Deadline */}
          {alert.compliance_deadline && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-red-800 mb-1">Compliance Deadline</h3>
              <p className="text-sm text-red-700">
                Brokers must comply by{" "}
                <strong>{new Date(alert.compliance_deadline).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</strong>.
                {alert.user_action_required && " Action may be required from account holders."}
              </p>
            </div>
          )}

          {/* User Action Required */}
          {alert.user_action_required && !alert.compliance_deadline && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-amber-800 mb-1">Action Required</h3>
              <p className="text-sm text-amber-700">This change may require action from investors. Review the action items above.</p>
            </div>
          )}

          {alert.source_url && (
            <a href={alert.source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-slate-700 hover:underline mb-6">
              Source: {alert.source_name || "View original"} →
            </a>
          )}

          {/* Related Alerts */}
          {alert.change_category && (
            <div className="mt-6 mb-4">
              <Link
                href={`/alerts?category=${alert.change_category}`}
                className="text-xs text-blue-600 hover:underline"
              >
                View all {alert.change_category.replace(/_/g, " ")} changes →
              </Link>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 mt-4">
            <strong>Disclaimer:</strong> {GENERAL_ADVICE_WARNING}
          </div>

          <div className="mt-6">
            <Link href="/alerts" className="text-sm text-slate-700 hover:underline">← Back to all alerts</Link>
          </div>
        </div>
      </div>
    </>
  );
}
