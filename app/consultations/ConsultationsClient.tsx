"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { trackEvent } from "@/lib/tracking";
import type { Consultation } from "@/lib/types";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "portfolio", label: "Portfolio Review" },
  { id: "tax", label: "Tax Planning" },
  { id: "broker-selection", label: "Broker Selection" },
  { id: "general", label: "General" },
];

const CATEGORY_COLORS: Record<string, string> = {
  portfolio: "bg-blue-50 text-blue-700",
  tax: "bg-purple-50 text-purple-700",
  "broker-selection": "bg-amber-50 text-amber-700",
  general: "bg-green-50 text-green-700",
};

interface Props {
  consultations: Consultation[];
}

export default function ConsultationsClient({ consultations }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");
  const { isPro, loading } = useSubscription();

  const filtered =
    activeCategory === "all"
      ? consultations
      : consultations.filter((c) => c.category === activeCategory);

  return (
    <div className="py-12">
      <div className="container-custom max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
            Expert Consultations
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Book a 1-on-1 session with a qualified investment expert.
            Get personalised advice on your portfolio, tax strategy, or broker choice.
          </p>
          {!loading && isPro && (
            <div className="mt-3 inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
              Pro Discount Active
            </div>
          )}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                trackEvent("consultation_filter", { category: cat.id }, "/consultations");
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium mb-2">No consultations available</p>
            <p className="text-sm">Check back soon — new sessions are added regularly.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <ConsultationCard
                key={c.id}
                consultation={c}
                isPro={isPro}
                loading={loading}
              />
            ))}
          </div>
        )}

        {/* Pro upsell */}
        {!loading && !isPro && consultations.some((c) => c.pro_price) && (
          <div className="mt-12 text-center bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-2">Save on Every Session</h2>
            <p className="text-sm text-slate-600 mb-4">
              Investor Pro members get discounted rates on all expert consultations.
            </p>
            <Link
              href="/pro"
              className="inline-block px-6 py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors"
            >
              Learn About Investor Pro →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ConsultationCard({
  consultation: c,
  isPro,
  loading,
}: {
  consultation: Consultation;
  isPro: boolean;
  loading: boolean;
}) {
  const priceInCents = isPro && c.pro_price ? c.pro_price : c.price;
  const priceDisplay = (priceInCents / 100).toFixed(0);
  const fullPriceDisplay = (c.price / 100).toFixed(0);
  const hasDiscount = isPro && c.pro_price && c.pro_price < c.price;
  const categoryColor = CATEGORY_COLORS[c.category] || CATEGORY_COLORS.general;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow flex flex-col">
      {/* Consultant info */}
      <div className="flex items-center gap-3 mb-4">
        {c.consultant?.avatar_url ? (
          <Image
            src={c.consultant.avatar_url}
            alt={c.consultant.full_name}
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-700">
            {c.consultant?.full_name?.charAt(0) || "?"}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {c.consultant?.full_name || "Expert"}
          </p>
          {c.consultant?.credentials?.[0] && (
            <p className="text-xs text-slate-500">{c.consultant.credentials[0]}</p>
          )}
        </div>
      </div>

      {/* Title + description */}
      <h3 className="font-bold text-lg text-slate-900 mb-1">{c.title}</h3>
      {c.description && (
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{c.description}</p>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryColor}`}>
          {c.category.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
        </span>
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
          {c.duration_minutes} min
        </span>
      </div>

      {/* Price + CTA */}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            {!loading && hasDiscount ? (
              <>
                <span className="text-sm text-slate-400 line-through">
                  ${fullPriceDisplay}
                </span>
                <span className="text-2xl font-extrabold text-slate-800">
                  ${priceDisplay}
                </span>
                <span className="px-1.5 py-0.5 text-[0.69rem] font-bold bg-amber-100 text-amber-700 rounded-full">
                  PRO
                </span>
              </>
            ) : (
              <span className="text-2xl font-extrabold text-slate-800">
                ${fullPriceDisplay}
              </span>
            )}
            <span className="text-xs text-slate-400">AUD</span>
          </div>
        </div>

        <Link
          href={`/consultations/${c.slug}`}
          className="block w-full py-2.5 text-center bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 hover:scale-[1.02] transition-all duration-200 text-sm"
        >
          Book Now →
        </Link>

        {!loading && !isPro && c.pro_price && c.pro_price < c.price && (
          <p className="text-xs text-slate-400 mt-2 text-center">
            <Link href="/pro" className="text-amber-600 underline hover:text-amber-700">
              Pro members
            </Link>{" "}
            save ${((c.price - c.pro_price) / 100).toFixed(0)}
          </p>
        )}
      </div>
    </div>
  );
}
