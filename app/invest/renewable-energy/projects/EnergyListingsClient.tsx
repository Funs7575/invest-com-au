"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import SectionHeading from "@/components/SectionHeading";

const STATES = ["All", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT"];
const TECHNOLOGIES = [
  { value: "all", label: "All Technologies" },
  { value: "solar", label: "Solar PV" },
  { value: "wind", label: "Wind" },
  { value: "battery", label: "Battery Storage (BESS)" },
  { value: "hydrogen", label: "Green Hydrogen" },
  { value: "hydro", label: "Pumped Hydro" },
];
const STAGES = [
  { value: "all", label: "All Stages" },
  { value: "development", label: "Development" },
  { value: "construction", label: "Construction" },
  { value: "operational", label: "Operational" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function EnergyListingsClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = searchParams.get("state") ?? "All";
  const tech = searchParams.get("tech") ?? "all";
  const stage = searchParams.get("stage") ?? "all";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "All") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (state !== "All" && l.location_state !== state) return false;
      if (tech !== "all") {
        const t = (l.key_metrics?.technology as string | undefined)?.toLowerCase();
        if (t !== tech && l.industry !== tech && l.sub_category !== tech) return false;
      }
      if (stage !== "all") {
        const s = (l.key_metrics?.stage as string | undefined)?.toLowerCase();
        if (s !== stage && l.sub_category !== stage) return false;
      }
      return true;
    });
  }, [listings, state, tech, stage]);

  return (
    <div>
      <section className="bg-gradient-to-br from-teal-900 via-slate-900 to-slate-900 text-white py-12 md:py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest/renewable-energy" className="hover:text-white transition-colors">Renewable Energy</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <span className="text-slate-300">Projects</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Renewable Energy Projects Seeking Investment</h1>
          <p className="text-slate-300 text-base max-w-2xl">
            {listings.length > 0
              ? `${listings.length} active project${listings.length !== 1 ? "s" : ""} — solar, wind, battery, and hydrogen`
              : "Direct co-investment opportunities in Australian renewable energy projects"}
          </p>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200 py-4 sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5">
              <Icon name="map-pin" size={14} className="text-slate-400" />
              <select
                value={state}
                onChange={(e) => setParam("state", e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>{s === "All" ? "All States" : s}</option>
                ))}
              </select>
            </div>
            <select
              value={tech}
              onChange={(e) => setParam("tech", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {TECHNOLOGIES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={stage}
              onChange={(e) => setParam("stage", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <span className="ml-auto text-sm text-slate-500">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </section>

      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="search" size={28} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No projects found</h3>
              <p className="text-slate-500 text-sm mb-6">Try adjusting your filters, or check back soon as new projects are listed regularly.</p>
              <button
                onClick={() => router.push("/invest/renewable-energy/projects")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <SectionHeading eyebrow="Active projects" title={`${filtered.length} Energy Project${filtered.length !== 1 ? "s" : ""}`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="energy" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">List Your Energy Project</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Seeking co-investors for your renewable energy project? List on Invest.com.au.
          </p>
          <Link
            href="/invest/list"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            List Your Project
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
