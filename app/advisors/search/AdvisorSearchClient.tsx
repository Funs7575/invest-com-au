"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface AdvisorRow {
  id: number;
  slug: string;
  name: string;
  firm_name: string | null;
  type: string;
  specialties: string[] | null;
  location_state: string | null;
  location_suburb: string | null;
  location_display: string | null;
  rating: number | null;
  review_count: number | null;
  fee_structure: string | null;
  fee_description: string | null;
  photo_url: string | null;
  verified: boolean | null;
  accepts_new_clients: boolean | null;
  response_time_hours: number | null;
  advisor_tier: string | null;
  intro_video_url: string | null;
  booking_link: string | null;
}

interface Props {
  initialAdvisors: AdvisorRow[];
}

const TYPE_LABELS: Record<string, string> = {
  financial_planner: "Financial planner",
  smsf_accountant: "SMSF accountant",
  tax_agent: "Tax agent",
  mortgage_broker: "Mortgage broker",
  property_advisor: "Property advisor",
  estate_planner: "Estate planner",
  insurance_broker: "Insurance broker",
};

const FEE_LABELS: Record<string, string> = {
  flat: "Flat fee",
  hourly: "Hourly",
  percentage: "% AUM",
  retainer: "Retainer",
};

type SortKey = "rating" | "response_time" | "tier" | "name";

export default function AdvisorSearchClient({ initialAdvisors }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [feeFilter, setFeeFilter] = useState<string>("all");
  const [acceptingOnly, setAcceptingOnly] = useState(false);
  const [videoOnly, setVideoOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("rating");

  const advisors = initialAdvisors;

  // Derive filter options from the dataset so we never show a
  // filter value that has zero matches — clean UX beats static lists.
  const typeOptions = useMemo(() => {
    const s = new Set(advisors.map((a) => a.type).filter(Boolean));
    return Array.from(s).sort();
  }, [advisors]);
  const stateOptions = useMemo(() => {
    const s = new Set(
      advisors.map((a) => a.location_state).filter((v): v is string => !!v),
    );
    return Array.from(s).sort();
  }, [advisors]);
  const feeOptions = useMemo(() => {
    const s = new Set(
      advisors.map((a) => a.fee_structure).filter((v): v is string => !!v),
    );
    return Array.from(s).sort();
  }, [advisors]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = advisors;
    if (q) {
      list = list.filter((a) => {
        const hay = [
          a.name,
          a.firm_name || "",
          a.location_display || "",
          a.location_suburb || "",
          ...(a.specialties || []),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (typeFilter !== "all") list = list.filter((a) => a.type === typeFilter);
    if (stateFilter !== "all")
      list = list.filter((a) => a.location_state === stateFilter);
    if (feeFilter !== "all")
      list = list.filter((a) => a.fee_structure === feeFilter);
    if (acceptingOnly)
      list = list.filter((a) => a.accepts_new_clients !== false);
    if (videoOnly) list = list.filter((a) => !!a.intro_video_url);

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "response_time":
          return (a.response_time_hours || 9999) - (b.response_time_hours || 9999);
        case "tier": {
          const order: Record<string, number> = { gold: 0, silver: 1, bronze: 2 };
          const ra = order[a.advisor_tier || ""] ?? 3;
          const rb = order[b.advisor_tier || ""] ?? 3;
          return ra - rb;
        }
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    return list;
  }, [advisors, query, typeFilter, stateFilter, feeFilter, acceptingOnly, videoOnly, sortKey]);

  return (
    <div className="py-6 md:py-12">
      <div className="container-custom">
        <nav className="text-xs md:text-sm text-slate-500 mb-3">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/advisors" className="hover:text-slate-900">Advisors</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Advanced search</span>
        </nav>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
            Find an advisor
          </h1>
          <p className="text-sm text-slate-600">
            Filter ASIC-registered advisors by specialty, location, fee structure
            and availability. {filtered.length} match
            {filtered.length === 1 ? "" : "es"}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
          {/* Filter rail */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="block mb-3">
                <span className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Search
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, firm, suburb, specialty"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block mb-3">
                <span className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Type
                </span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">Any type</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t] || t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block mb-3">
                <span className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  State
                </span>
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">Any state</option>
                  {stateOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block mb-3">
                <span className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Fee structure
                </span>
                <select
                  value={feeFilter}
                  onChange={(e) => setFeeFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">Any fee structure</option>
                  {feeOptions.map((f) => (
                    <option key={f} value={f}>
                      {FEE_LABELS[f] || f}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 mb-2">
                <input
                  type="checkbox"
                  checked={acceptingOnly}
                  onChange={(e) => setAcceptingOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                Only accepting new clients
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={videoOnly}
                  onChange={(e) => setVideoOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                With intro video
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="block text-[11px] font-bold uppercase text-slate-500 mb-2">
                Sort by
              </span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="rating">Rating (high to low)</option>
                <option value="response_time">Fastest response time</option>
                <option value="tier">Tier (gold first)</option>
                <option value="name">Name A → Z</option>
              </select>
            </div>
          </aside>

          {/* Results */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-sm text-slate-600">
                  No advisors match those filters. Try loosening the type or
                  state filter.
                </p>
              </div>
            ) : (
              filtered.map((a) => (
                <article
                  key={a.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    {a.photo_url ? (
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-100 shrink-0">
                        <Image
                          src={a.photo_url}
                          alt={a.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full bg-slate-100 shrink-0 flex items-center justify-center text-xl font-bold text-slate-500"
                        aria-hidden
                      >
                        {a.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <Link
                          href={`/advisor/${a.slug}`}
                          className="text-base md:text-lg font-extrabold text-slate-900 hover:text-primary"
                        >
                          {a.name}
                        </Link>
                        {a.advisor_tier && (
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              a.advisor_tier === "gold"
                                ? "bg-amber-100 text-amber-800"
                                : a.advisor_tier === "silver"
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {a.advisor_tier}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {TYPE_LABELS[a.type] || a.type}
                        {a.firm_name ? ` · ${a.firm_name}` : ""}
                        {a.location_display ? ` · ${a.location_display}` : ""}
                      </p>
                      {a.specialties && a.specialties.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {a.specialties.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                        {a.rating != null && (
                          <span>
                            ★ {a.rating.toFixed(1)}
                            {a.review_count ? ` (${a.review_count})` : ""}
                          </span>
                        )}
                        {a.fee_structure && (
                          <span>
                            {FEE_LABELS[a.fee_structure] || a.fee_structure}
                          </span>
                        )}
                        {a.accepts_new_clients !== false ? (
                          <span className="text-emerald-700 font-semibold">
                            ✓ Accepting new clients
                          </span>
                        ) : (
                          <span className="text-rose-700">
                            ✗ Not accepting new clients
                          </span>
                        )}
                        {a.intro_video_url && (
                          <span className="text-indigo-700 font-semibold">
                            ▶ Video intro
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
