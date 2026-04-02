"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import SectionHeading from "@/components/SectionHeading";

const SECTORS = [
  { value: "all", label: "All Sectors" },
  { value: "fintech", label: "Fintech" },
  { value: "healthtech", label: "Healthtech" },
  { value: "agtech", label: "AgTech" },
  { value: "climate", label: "Climate Tech" },
  { value: "saas", label: "SaaS / B2B" },
  { value: "consumer", label: "Consumer" },
  { value: "deeptech", label: "Deep Tech" },
];
const STAGES = [
  { value: "all", label: "All Stages" },
  { value: "pre_seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B+" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function StartupListingsClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sector = searchParams.get("sector") ?? "all";
  const stage = searchParams.get("stage") ?? "all";
  const esic = searchParams.get("esic") === "true";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "All") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function toggleEsic() {
    const params = new URLSearchParams(searchParams.toString());
    if (esic) { params.delete("esic"); } else { params.set("esic", "true"); }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (sector !== "all" && l.industry !== sector && l.sub_category !== sector) return false;
      if (stage !== "all") {
        const s = (l.key_metrics?.stage as string | undefined)?.toLowerCase().replace(/\s+/g, "_");
        if (s !== stage && l.sub_category !== stage) return false;
      }
      if (esic && !(l.key_metrics?.esic_eligible ?? false)) return false;
      return true;
    });
  }, [listings, sector, stage, esic]);

  return (
    <div>
      <section className="bg-gradient-to-br from-rose-900 via-slate-900 to-slate-900 text-white py-12 md:py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest/startups" className="hover:text-white transition-colors">Startups</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <span className="text-slate-300">Opportunities</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Startup Investment Opportunities</h1>
          <p className="text-slate-300 text-base max-w-2xl">
            {listings.length > 0
              ? `${listings.length} Australian startup${listings.length !== 1 ? "s" : ""} raising capital`
              : "Australian startups and growth companies raising capital from investors"}
          </p>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200 py-4 sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={sector}
              onChange={(e) => setParam("sector", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {SECTORS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
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
            <button
              onClick={toggleEsic}
              className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                esic ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-600 border-slate-200 hover:border-rose-400"
              }`}
            >
              <Icon name="star" size={13} />
              ESIC Eligible
            </button>
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
              <h3 className="text-lg font-bold text-slate-900 mb-2">No opportunities found</h3>
              <p className="text-slate-500 text-sm mb-6">Try adjusting your filters, or check back soon as new startups are listed regularly.</p>
              <button
                onClick={() => router.push("/invest/startups/opportunities")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <SectionHeading eyebrow="Raising capital" title={`${filtered.length} Startup Opportunit${filtered.length !== 1 ? "ies" : "y"}`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="startup" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ESIC callout */}
      <section className="py-10 bg-rose-50 border-t border-rose-100">
        <div className="container-custom">
          <div className="bg-white border border-rose-200 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <Icon name="dollar-sign" size={24} className="text-rose-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-1">ESIC Tax Incentives</h3>
              <p className="text-sm text-slate-600">
                Investing in qualifying ESIC (Early Stage Innovation Company) startups gives you a 20% non-refundable tax offset (up to $200K/year) and a 10-year CGT exemption. Look for the ESIC badge on listings.
              </p>
            </div>
            <button
              onClick={toggleEsic}
              className={`shrink-0 inline-flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors ${
                esic ? "bg-rose-600 text-white" : "bg-rose-500 hover:bg-rose-400 text-white"
              }`}
            >
              {esic ? "Showing ESIC only" : "Show ESIC eligible"}
              <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">Raise Capital for Your Startup</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Founders can list their startup on Invest.com.au to reach qualified angel investors and family offices.
          </p>
          <Link
            href="/invest/list"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            List Your Startup
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
