"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  PROFESSIONAL_TYPE_LABELS,
  AU_STATES,
  AU_LANGUAGES,
  type ProfessionalType,
} from "@/lib/types";

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
  accepts_international_clients: boolean | null;
  languages: string[] | null;
  response_time_hours: number | null;
  advisor_tier: string | null;
  intro_video_url: string | null;
  booking_link: string | null;
  featured_until: string | null;
  created_at: string;
}

interface Props {
  initialAdvisors: AdvisorRow[];
}

const FEE_LABELS: Record<string, string> = {
  flat: "Flat fee",
  hourly: "Hourly",
  percentage: "% AUM",
  retainer: "Retainer",
  commission: "Commission",
};

type SortKey = "featured" | "rating" | "name" | "newest" | "response_time";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured first" },
  { value: "rating", label: "Rating (high to low)" },
  { value: "name", label: "Alphabetical (A → Z)" },
  { value: "newest", label: "Newest" },
  { value: "response_time", label: "Fastest response time" },
];

const typeLabel = (key: string): string => {
  return PROFESSIONAL_TYPE_LABELS[key as ProfessionalType] ?? key;
};

const isFeatured = (a: AdvisorRow): boolean => {
  if (!a.featured_until) return false;
  return new Date(a.featured_until).getTime() > Date.now();
};

export default function AdvisorSearchClient({ initialAdvisors }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [feeFilter, setFeeFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [internationalOnly, setInternationalOnly] = useState(false);
  const [acceptingOnly, setAcceptingOnly] = useState(false);
  const [videoOnly, setVideoOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("featured");

  const advisors = initialAdvisors;

  // Derive filter options from the dataset so we never show a filter
  // value that has zero matches. Falls back to a full preset list for
  // languages so rare-language advisors (Punjabi, Greek) still appear
  // in the dropdown.
  const typeOptions = useMemo(() => {
    const s = new Set(advisors.map((a) => a.type).filter(Boolean));
    return Array.from(s).sort((a, b) => typeLabel(a).localeCompare(typeLabel(b)));
  }, [advisors]);

  const stateOptions = useMemo(() => {
    const present = new Set(
      advisors.map((a) => a.location_state).filter((v): v is string => !!v),
    );
    // Return the canonical AU_STATES order with only those that have data.
    // If no data yet (pre-launch), show every state so the filter is
    // at least functional.
    if (present.size === 0) return [...AU_STATES];
    return AU_STATES.filter((s) => present.has(s));
  }, [advisors]);

  const feeOptions = useMemo(() => {
    const s = new Set(
      advisors.map((a) => a.fee_structure).filter((v): v is string => !!v),
    );
    return Array.from(s).sort();
  }, [advisors]);

  const languageOptions = useMemo(() => {
    const present = new Set<string>();
    for (const a of advisors) {
      for (const l of a.languages ?? []) {
        if (l) present.add(l);
      }
    }
    // Prefer the canonical list order when we have data — alphabetise
    // the long tail. When there's no data, show the full preset list.
    if (present.size === 0) return [...AU_LANGUAGES];
    const ordered = AU_LANGUAGES.filter((l) => present.has(l));
    const extra = Array.from(present)
      .filter((l) => !(AU_LANGUAGES as readonly string[]).includes(l))
      .sort();
    return [...ordered, ...extra];
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
          ...(a.languages || []),
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
    if (languageFilter !== "all")
      list = list.filter((a) => (a.languages ?? []).includes(languageFilter));
    if (internationalOnly)
      list = list.filter((a) => a.accepts_international_clients === true);
    if (acceptingOnly)
      list = list.filter((a) => a.accepts_new_clients !== false);
    if (videoOnly) list = list.filter((a) => !!a.intro_video_url);

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "featured": {
          // Featured rows first, then rating descending.
          const fa = isFeatured(a) ? 1 : 0;
          const fb = isFeatured(b) ? 1 : 0;
          if (fa !== fb) return fb - fa;
          return (b.rating || 0) - (a.rating || 0);
        }
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "name":
          return a.name.localeCompare(b.name);
        case "newest":
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
        case "response_time":
          return (
            (a.response_time_hours || 9999) - (b.response_time_hours || 9999)
          );
        default:
          return 0;
      }
    });
    return list;
  }, [
    advisors,
    query,
    typeFilter,
    stateFilter,
    feeFilter,
    languageFilter,
    internationalOnly,
    acceptingOnly,
    videoOnly,
    sortKey,
  ]);

  const resetAll = () => {
    setQuery("");
    setTypeFilter("all");
    setStateFilter("all");
    setFeeFilter("all");
    setLanguageFilter("all");
    setInternationalOnly(false);
    setAcceptingOnly(false);
    setVideoOnly(false);
    setSortKey("featured");
  };

  const activeFilterCount =
    (query ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (stateFilter !== "all" ? 1 : 0) +
    (feeFilter !== "all" ? 1 : 0) +
    (languageFilter !== "all" ? 1 : 0) +
    (internationalOnly ? 1 : 0) +
    (acceptingOnly ? 1 : 0) +
    (videoOnly ? 1 : 0);

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
            Advanced Advisor Search
          </h1>
          <p className="text-sm text-slate-600">
            Filter ASIC-registered Australian advisors by specialty, location,
            language, availability and international-client status.{" "}
            <span className="font-semibold text-slate-900">
              {filtered.length} match{filtered.length === 1 ? "" : "es"}
            </span>
            {activeFilterCount > 0 && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-amber-700 hover:text-amber-800 font-semibold underline-offset-2 hover:underline"
                >
                  Reset all filters
                </button>
              </>
            )}
            .
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
          {/* Filter rail */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="block mb-3">
                <span className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Keyword
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, firm, suburb, specialty, language"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-500"
                />
              </label>

              <label className="block mb-3">
                <span className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Advisor type
                </span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">Any type</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {typeLabel(t)}
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
                  Language
                </span>
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">Any language</option>
                  {languageOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
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
                  checked={internationalOnly}
                  onChange={(e) => setInternationalOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                Accepts international clients
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
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </aside>

          {/* Results */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-sm text-slate-600 mb-4">
                  No advisors match those filters. Try loosening the type,
                  state or language filter.
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg"
                  >
                    Reset all filters
                  </button>
                )}
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
                        <div className="flex items-center gap-1.5">
                          {isFeatured(a) && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Featured
                            </span>
                          )}
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
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {typeLabel(a.type)}
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
                      {a.languages && a.languages.length > 0 && (
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          Speaks: {a.languages.slice(0, 4).join(", ")}
                        </p>
                      )}
                      <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
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
                        {a.accepts_international_clients && (
                          <span className="text-sky-700 font-semibold">
                            🌏 International clients
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
