"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import Icon from "@/components/Icon";
import PropertyDisclaimer from "@/components/PropertyDisclaimer";
import { BUYER_AGENT_DISCLOSURE } from "@/lib/compliance";

interface BuyerAgent {
  id: number;
  slug: string;
  name: string;
  photo_url: string | null;
  agency_name: string | null;
  bio: string | null;
  states_covered: string[];
  suburbs_speciality: string[];
  investment_focus: string[];
  avg_property_value: string | null;
  fee_structure: string | null;
  rating: number;
  review_count: number;
  verified: boolean;
  featured: boolean;
}

const STATES = ["All", "NSW", "VIC", "QLD", "WA", "SA", "TAS"];
const FOCUS_TYPES = ["All", "Capital Growth", "Cash Flow", "Prestige", "First Home Buyer", "Portfolio Building"];

export default function BuyerAgentsPage() {
  const [agents, setAgents] = useState<BuyerAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("All");
  const [focusFilter, setFocusFilter] = useState("All");

  useEffect(() => {
    async function fetchAgents() {
      setLoading(true);
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      let query = supabase
        .from("buyer_agents")
        .select("id, slug, name, photo_url, agency_name, bio, states_covered, suburbs_speciality, investment_focus, avg_property_value, fee_structure, rating, review_count, verified, featured")
        .eq("status", "active")
        .order("featured", { ascending: false })
        .order("rating", { ascending: false });

      if (stateFilter !== "All") {
        query = query.contains("states_covered", [stateFilter]);
      }
      if (focusFilter !== "All") {
        query = query.contains("investment_focus", [focusFilter]);
      }

      const { data } = await query;
      setAgents(data || []);
      setLoading(false);
    }
    fetchAgents();
  }, [stateFilter, focusFilter]);

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-white border-b border-slate-100">
        <div className="container-custom py-6 md:py-8">
          <nav className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-600">Home</Link>
            <span>/</span>
            <Link href="/property" className="hover:text-slate-600">Property</Link>
            <span>/</span>
            <span className="text-slate-600">Buyer&apos;s Agents</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Find a Buyer&apos;s Agent</h1>
          <p className="text-sm text-slate-500">Verified buyer&apos;s agents who negotiate on your behalf. Free consultation, no obligation.</p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-slate-50 border-b border-slate-200 sticky top-16 lg:top-20 z-30">
        <div className="container-custom py-3">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex gap-1 overflow-x-auto">
              {STATES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStateFilter(s)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    stateFilter === s ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="h-6 w-px bg-slate-200 hidden md:block" />
            <select
              value={focusFilter}
              onChange={(e) => setFocusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              {FOCUS_TYPES.map((f) => (
                <option key={f} value={f}>{f === "All" ? "All Focus Types" : f}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Agent Grid */}
      <section className="py-6 md:py-8">
        <div className="container-custom">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full" />
                    <div className="space-y-1.5 flex-1"><div className="h-4 bg-slate-100 rounded w-2/3" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-16">
              <Icon name="users" size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No agents match your filters.</p>
              <button onClick={() => { setStateFilter("All"); setFocusFilter("All"); }} className="mt-2 text-sm text-amber-600 font-semibold hover:text-amber-700">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <div key={agent.id} className="border border-slate-200 bg-white rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                      <Icon name="user" size={20} className="text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 truncate">{agent.name}</p>
                        {agent.verified && <Icon name="shield-check" size={14} className="text-emerald-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{agent.agency_name}</p>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`w-3.5 h-3.5 ${i < Math.round(agent.rating) ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">{agent.rating}/5 ({agent.review_count} reviews)</span>
                  </div>

                  {agent.bio && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{agent.bio}</p>}

                  {/* States & Focus */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {agent.states_covered.map((s) => (
                      <span key={s} className="text-[0.6rem] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">{s}</span>
                    ))}
                    {agent.investment_focus.slice(0, 2).map((f) => (
                      <span key={f} className="text-[0.6rem] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>

                  {agent.fee_structure && (
                    <p className="text-xs text-slate-400 mb-3">Fee: {agent.fee_structure}</p>
                  )}

                  <Link
                    href={`/property/buyer-agents/${agent.slug}`}
                    className="block w-full text-center py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-all"
                  >
                    Get a Free Consultation
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Buyer Agent Disclosure */}
      <section className="pb-6 md:pb-8">
        <div className="container-custom">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-1">Important Disclosure</p>
                <p className="text-[0.65rem] md:text-xs text-slate-500 leading-relaxed">{BUYER_AGENT_DISCLOSURE}</p>
                <PropertyDisclaimer />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
