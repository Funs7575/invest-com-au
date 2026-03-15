"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import AdvisorMatchCTA from "@/components/AdvisorMatchCTA";

/* ─── Types ─── */

interface Property {
  id: number;
  suburb: string;
  state: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  type: "house" | "unit" | "townhouse";
  grossYield: number;
  weeklyRent: number;
  description: string;
}

/* ─── Sample Data ─── */

const PROPERTIES: Property[] = [
  {
    id: 1,
    suburb: "Parramatta",
    state: "NSW",
    price: 750000,
    bedrooms: 2,
    bathrooms: 1,
    type: "unit",
    grossYield: 4.8,
    weeklyRent: 690,
    description:
      "Modern apartment in the heart of Parramatta CBD with strong rental demand from professionals and students. Close to train station and Westfield.",
  },
  {
    id: 2,
    suburb: "Logan",
    state: "QLD",
    price: 480000,
    bedrooms: 3,
    bathrooms: 1,
    type: "house",
    grossYield: 5.5,
    weeklyRent: 510,
    description:
      "Affordable family home in a high-growth corridor south of Brisbane. Low vacancy rates and strong population growth driving rental demand.",
  },
  {
    id: 3,
    suburb: "Geelong",
    state: "VIC",
    price: 620000,
    bedrooms: 3,
    bathrooms: 2,
    type: "townhouse",
    grossYield: 4.2,
    weeklyRent: 500,
    description:
      "Contemporary townhouse in Geelong's expanding residential precinct. Ideal for families with easy access to Melbourne via V/Line.",
  },
  {
    id: 4,
    suburb: "Adelaide",
    state: "SA",
    price: 550000,
    bedrooms: 3,
    bathrooms: 1,
    type: "house",
    grossYield: 5.1,
    weeklyRent: 540,
    description:
      "Solid brick home in Adelaide's western suburbs offering excellent rental yield and proximity to major employment hubs.",
  },
  {
    id: 5,
    suburb: "Blacktown",
    state: "NSW",
    price: 680000,
    bedrooms: 3,
    bathrooms: 2,
    type: "house",
    grossYield: 4.5,
    weeklyRent: 590,
    description:
      "Well-maintained family home in one of Western Sydney's most connected suburbs. Walking distance to station and shopping centres.",
  },
  {
    id: 6,
    suburb: "Ipswich",
    state: "QLD",
    price: 420000,
    bedrooms: 3,
    bathrooms: 1,
    type: "house",
    grossYield: 5.8,
    weeklyRent: 470,
    description:
      "High-yield Queenslander in Ipswich with strong rental demand. Infrastructure investment driving long-term capital growth.",
  },
  {
    id: 7,
    suburb: "Rockingham",
    state: "WA",
    price: 510000,
    bedrooms: 4,
    bathrooms: 2,
    type: "house",
    grossYield: 5.3,
    weeklyRent: 520,
    description:
      "Spacious four-bedroom home close to the coast in Perth's southern corridor. Strong tenant demand from FIFO workers and families.",
  },
  {
    id: 8,
    suburb: "Melbourne CBD",
    state: "VIC",
    price: 520000,
    bedrooms: 2,
    bathrooms: 1,
    type: "unit",
    grossYield: 4.6,
    weeklyRent: 460,
    description:
      "Inner-city apartment with CBD views. Suited to professionals and students, with high occupancy and easy leasing.",
  },
  {
    id: 9,
    suburb: "Elizabeth",
    state: "SA",
    price: 380000,
    bedrooms: 3,
    bathrooms: 1,
    type: "house",
    grossYield: 6.1,
    weeklyRent: 445,
    description:
      "Affordable entry point in Adelaide's northern growth area. Highest yield on this list with a renovated interior.",
  },
  {
    id: 10,
    suburb: "Penrith",
    state: "NSW",
    price: 720000,
    bedrooms: 4,
    bathrooms: 2,
    type: "house",
    grossYield: 4.3,
    weeklyRent: 595,
    description:
      "Large family home at the foot of the Blue Mountains with room for granny flat potential. Strong capital growth area.",
  },
  {
    id: 11,
    suburb: "Caboolture",
    state: "QLD",
    price: 450000,
    bedrooms: 3,
    bathrooms: 2,
    type: "townhouse",
    grossYield: 5.4,
    weeklyRent: 465,
    description:
      "Low-maintenance townhouse in a growing Moreton Bay suburb. Easy commute to Brisbane and popular with young families.",
  },
  {
    id: 12,
    suburb: "Joondalup",
    state: "WA",
    price: 590000,
    bedrooms: 3,
    bathrooms: 2,
    type: "house",
    grossYield: 4.9,
    weeklyRent: 555,
    description:
      "Established family home in Perth's northern corridor near Joondalup CBD, university, and hospital precinct.",
  },
];

/* ─── Filter & Sort Config ─── */

const STATE_TABS = ["All", "NSW", "VIC", "QLD", "SA", "WA"] as const;
type StateTab = (typeof STATE_TABS)[number];

type SortKey = "price-asc" | "price-desc" | "yield-desc" | "rent-desc";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "yield-desc", label: "Yield: Highest" },
  { key: "rent-desc", label: "Rent: Highest" },
];

const TYPE_COLORS: Record<Property["type"], string> = {
  house: "bg-amber-100 text-amber-700",
  unit: "bg-blue-100 text-blue-700",
  townhouse: "bg-emerald-100 text-emerald-700",
};

function formatPrice(n: number) {
  return "$" + n.toLocaleString("en-AU");
}

/* ─── Component ─── */

export default function PropertiesClient() {
  const [stateTab, setStateTab] = useState<StateTab>("All");
  const [sortKey, setSortKey] = useState<SortKey>("yield-desc");

  const filtered = useMemo(() => {
    let list = stateTab === "All" ? PROPERTIES : PROPERTIES.filter((p) => p.state === stateTab);

    switch (sortKey) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "yield-desc":
        list = [...list].sort((a, b) => b.grossYield - a.grossYield);
        break;
      case "rent-desc":
        list = [...list].sort((a, b) => b.weeklyRent - a.weeklyRent);
        break;
    }

    return list;
  }, [stateTab, sortKey]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-teal-600 to-teal-800 text-white py-10 md:py-16">
        <div className="container-custom">
          <nav className="text-xs text-teal-200 mb-3">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-white">Property Listings</span>
          </nav>
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2">
            Investment Property Listings
          </h1>
          <p className="text-sm md:text-lg text-teal-100 max-w-2xl">
            Explore illustrative investment property opportunities across Australia. Compare
            gross yields, weekly rents, and suburb profiles to find your next investment.
          </p>
        </div>
      </section>

      <div className="container-custom py-6 md:py-10">
        {/* Filter Tabs + Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by state">
            {STATE_TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={stateTab === tab}
                onClick={() => setStateTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  stateTab === tab
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            aria-label="Sort properties"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filtered.map((property) => (
            <div
              key={property.id}
              className="border border-slate-200 rounded-xl bg-white hover:shadow-lg transition-shadow flex flex-col"
            >
              <div className="p-4 md:p-5 flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-slate-900">
                      {property.suburb}, {property.state}
                    </h3>
                    <span
                      className={`inline-block text-[0.65rem] md:text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                        TYPE_COLORS[property.type]
                      }`}
                    >
                      {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                    </span>
                  </div>
                  <span className="text-lg md:text-xl font-extrabold text-slate-900">
                    {formatPrice(property.price)}
                  </span>
                </div>

                {/* Bed / Bath */}
                <div className="flex items-center gap-3 text-xs md:text-sm text-slate-600 mb-3">
                  <span className="flex items-center gap-1">
                    <Icon name="layout-dashboard" size={14} className="text-slate-400" />
                    {property.bedrooms} bed
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="dollar-sign" size={14} className="text-slate-400" />
                    {property.bathrooms} bath
                  </span>
                </div>

                {/* Yield + Rent */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <Icon name="trending-up" size={14} className="text-emerald-600" />
                    {property.grossYield}% yield
                  </span>
                  <span className="text-xs md:text-sm text-slate-600">
                    {formatPrice(property.weeklyRent)}/wk
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
                  {property.description}
                </p>

                {/* CTA */}
                <Link
                  href="/property-yield-calculator"
                  className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Icon name="bar-chart" size={14} className="text-white" />
                  Analyse
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm md:text-lg font-medium mb-1">No properties found</p>
            <p className="text-xs md:text-sm">Try selecting a different state filter.</p>
          </div>
        )}

        {/* Advisor CTA */}
        <AdvisorMatchCTA
          needKey="property"
          headline="Want expert help finding investment properties?"
          description="A property advisor can identify high-growth areas, negotiate purchases, and build a portfolio strategy tailored to your goals."
        />

        {/* SEO Content */}
        <section className="border-t border-slate-200 pt-8 mt-8">
          <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 mb-3">
            Property Investing in Australia
          </h2>
          <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-3">
            <p>
              Australian property remains one of the most popular asset classes for building
              long-term wealth. With a combination of rental income and capital growth, investment
              properties can deliver strong total returns when chosen carefully.
            </p>
            <p>
              Key factors to evaluate when assessing an investment property include gross rental
              yield, vacancy rates, local infrastructure spending, population growth, and proximity
              to transport and employment centres. States like Queensland and South Australia
              currently offer higher yields, while NSW and VIC tend to deliver stronger long-term
              capital appreciation.
            </p>
            <p>
              Negative gearing, depreciation schedules, and capital gains tax concessions all play
              a role in the after-tax returns of Australian property investments. Consider working
              with a qualified tax agent and property advisor to maximise your returns.
            </p>
          </div>
        </section>

        {/* Disclaimer */}
        <p className="text-[0.65rem] md:text-xs text-slate-400 mt-6 border-t border-slate-100 pt-4">
          Listings are illustrative examples only and do not represent real properties currently
          for sale. Actual listings come from third-party sources. Always conduct your own due
          diligence before making any investment decision.
        </p>
      </div>
    </div>
  );
}
