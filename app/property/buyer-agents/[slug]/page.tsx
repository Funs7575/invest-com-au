import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import Icon from "@/components/Icon";
import BuyerAgentContactForm from "./BuyerAgentContactForm";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: agent } = await supabase
    .from("buyer_agents")
    .select("name, agency_name, bio, states_covered")
    .eq("slug", slug)
    .single();

  if (!agent) return { title: "Agent Not Found" };

  return {
    title: `${agent.name} — ${agent.agency_name || "Buyer's Agent"} — Invest.com.au`,
    description: agent.bio?.slice(0, 160) || `${agent.name} is a verified buyer's agent covering ${(agent.states_covered as string[]).join(", ")}.`,
    alternates: { canonical: `/property/buyer-agents/${slug}` },
  };
}

export default async function BuyerAgentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from("buyer_agents")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!agent) notFound();

  const mockPurchases = [
    { suburb: agent.suburbs_speciality?.[0] || "Inner West", type: "3 bed house", price: "$1.15M", saving: "Saved $45k under asking" },
    { suburb: agent.suburbs_speciality?.[1] || "CBD", type: "2 bed apartment", price: "$780k", saving: "Off-market acquisition" },
    { suburb: agent.suburbs_speciality?.[2] || "Northern suburbs", type: "4 bed house", price: "$1.42M", saving: "Negotiated $60k below reserve" },
  ];

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([
            { name: "Home", url: SITE_URL },
            { name: "Property", url: `${SITE_URL}/property` },
            { name: "Buyer's Agents", url: `${SITE_URL}/property/buyer-agents` },
            { name: agent.name },
          ])),
        }}
      />

      <div className="container-custom py-6 md:py-8">
        <nav className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span>/</span>
          <Link href="/property" className="hover:text-slate-600">Property</Link>
          <span>/</span>
          <Link href="/property/buyer-agents" className="hover:text-slate-600">Buyer&apos;s Agents</Link>
          <span>/</span>
          <span className="text-slate-600">{agent.name}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                <Icon name="user" size={28} className="text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">{agent.name}</h1>
                  {agent.verified && <Icon name="shield-check" size={18} className="text-emerald-500" />}
                </div>
                <p className="text-sm text-slate-500">{agent.agency_name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} className={`w-4 h-4 ${i < Math.round(agent.rating) ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-slate-500">{agent.rating}/5 ({agent.review_count} reviews)</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            {agent.bio && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">About</h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{agent.bio}</p>
              </div>
            )}

            {/* Speciality Suburbs */}
            {(agent.suburbs_speciality as string[])?.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Specialist Suburbs</h2>
                <div className="flex flex-wrap gap-2">
                  {(agent.suburbs_speciality as string[]).map((s: string) => (
                    <span key={s} className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Investment Focus */}
            {(agent.investment_focus as string[])?.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Investment Focus</h2>
                <div className="flex flex-wrap gap-2">
                  {(agent.investment_focus as string[]).map((f: string) => (
                    <span key={f} className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400">States Covered</p>
                <p className="font-bold text-slate-900">{(agent.states_covered as string[]).join(", ")}</p>
              </div>
              {agent.fee_structure && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Fee Structure</p>
                  <p className="font-bold text-slate-900">{agent.fee_structure}</p>
                </div>
              )}
              {agent.avg_property_value && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400">Avg Property Value</p>
                  <p className="font-bold text-slate-900">{agent.avg_property_value}</p>
                </div>
              )}
            </div>

            {/* Recent Purchases (mock) */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Recent Successful Purchases</h2>
              <div className="space-y-2">
                {mockPurchases.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon name="check-circle" size={16} className="text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{p.type} in {p.suburb}</p>
                      <p className="text-xs text-slate-400">{p.price} &middot; {p.saving}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column — Sticky */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              <BuyerAgentContactForm
                agentName={agent.name}
                agentEmail={agent.email}
                agencyName={agent.agency_name || ""}
              />

              {agent.website && (
                <a
                  href={agent.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-all"
                >
                  Visit Website &rarr;
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
