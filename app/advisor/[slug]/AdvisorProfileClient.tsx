"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Professional, ProfessionalReview, AdvisorFirm } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import Icon from "@/components/Icon";
import BookingWidget from "@/components/BookingWidget";
import AdvisorReviewForm from "@/components/AdvisorReviewForm";
import { getStoredUtm } from "@/components/UtmCapture";
import { trackEvent } from "@/lib/tracking";
import { getVerificationConfig, getVerificationLinks } from "@/lib/advisor-verification";
import { getQualificationData } from "@/lib/qualification-store";

const TYPE_TO_PLATFORMS: Record<string, { label: string; href: string }[]> = {
  smsf_accountant: [
    { label: "Best SMSF Platforms", href: "/best/smsf" },
    { label: "Best Super Funds", href: "/best/super-funds" },
  ],
  financial_planner: [
    { label: "Best Robo-Advisors", href: "/best/robo-advisors" },
    { label: "Best Super Funds", href: "/best/super-funds" },
    { label: "Best for Beginners", href: "/best/beginners" },
  ],
  property_advisor: [
    { label: "Property Investing", href: "/best/property-investing" },
    { label: "Best Mortgage Rates", href: "/best/term-deposits" },
  ],
  tax_agent: [
    { label: "Best Share Brokers", href: "/share-trading" },
    { label: "Best Crypto Exchanges", href: "/crypto" },
  ],
  mortgage_broker: [
    { label: "Property Investing", href: "/best/property-investing" },
    { label: "Savings Accounts", href: "/savings" },
  ],
  wealth_manager: [
    { label: "Best Robo-Advisors", href: "/best/robo-advisors" },
    { label: "Best ETF Platforms", href: "/best/etf-investing" },
  ],
  crypto_advisor: [
    { label: "Best Crypto Exchanges", href: "/crypto" },
    { label: "Best Bitcoin Exchange", href: "/best/bitcoin-exchange" },
  ],
  buyers_agent: [{ label: "Property Investing", href: "/best/property-investing" }],
  estate_planner: [{ label: "Best Super Funds", href: "/super" }],
  insurance_broker: [{ label: "Best Super Funds", href: "/super" }],
  aged_care_advisor: [
    { label: "Best Super Funds", href: "/super" },
    { label: "Best Savings Accounts", href: "/savings" },
  ],
  debt_counsellor: [
    { label: "High-Interest Savings", href: "/best/high-interest-savings" },
    { label: "Savings Accounts", href: "/savings" },
  ],
  real_estate_agent: [
    { label: "Property Investing", href: "/best/property-investing" },
    { label: "Best Savings Accounts", href: "/savings" },
  ],
};

function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className={`text-amber-400 tracking-tight ${className}`}>
      {"★".repeat(full)}{half ? "½" : ""}{"☆".repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700 w-7 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

function SectionCard({ id, title, icon, children, className = "" }: {
  id?: string; title?: string; icon?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div id={id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Icon name={icon} size={16} className="text-amber-600" />
            </div>
          )}
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

type ExpertArticle = {
  id: number; title: string; slug: string; excerpt: string;
  category: string; published_at: string; reading_time_mins: number | null; view_count: number;
};

export default function AdvisorProfileClient({
  professional: pro,
  similar,
  reviews = [],
  teamMembers = [],
  firm,
  expertArticles = [],
}: {
  professional: Professional;
  similar: Professional[];
  reviews?: ProfessionalReview[];
  teamMembers?: Professional[];
  firm?: AdvisorFirm | null;
  expertArticles?: ExpertArticle[];
}) {
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [alreadyMatched, setAlreadyMatched] = useState(false);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewState, setReviewState] = useState<"idle" | "success">("idle");
  const [bioExpanded, setBioExpanded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("invest_quiz_match");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.matchedAdvisors?.some((a: { slug: string }) => a.slug === pro.slug)) {
          setAlreadyMatched(true);
          if (data.quizData?.firstName) setName(data.quizData.firstName);
          if (data.quizData?.email) setEmail(data.quizData.email);
        }
      }
    } catch {}
  }, [pro.slug]);

  useEffect(() => {
    trackEvent("advisor_profile_view", {
      professional_id: pro.id,
      advisor_slug: pro.slug,
      type: pro.type,
      has_booking_link: !!pro.booking_link,
    }, `/advisor/${pro.slug}`);
  }, [pro.slug, pro.id, pro.type, pro.booking_link]);

  const typeLabel = PROFESSIONAL_TYPE_LABELS[pro.type] || "Financial Professional";
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const nameError = touched.name && !name.trim() ? "Name is required" : "";
  const emailError =
    touched.email && !email.trim()
      ? "Email is required"
      : touched.email && !isValidEmail(email)
      ? "Enter a valid email"
      : "";

  const handleSubmit = async () => {
    setTouched({ name: true, email: true });
    if (!name.trim() || !email.trim() || !isValidEmail(email)) {
      setFormError(!name.trim() ? "Please enter your name" : "Please enter a valid email");
      return;
    }
    setFormError("");
    setFormState("submitting");
    try {
      const res = await fetch("/api/advisor-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professional_id: pro.id,
          user_name: name.trim(),
          user_email: email.trim(),
          user_phone: phone.trim() || undefined,
          message: message.trim() || undefined,
          source_page: `/advisor/${pro.slug}`,
          pages_visited: typeof window !== "undefined" ? parseInt(sessionStorage.getItem("pages_visited") || "1") : 1,
          quiz_completed: typeof window !== "undefined" ? !!sessionStorage.getItem("quiz_completed") : false,
          calculator_used: typeof window !== "undefined" ? !!sessionStorage.getItem("calculator_used") : false,
          qualification_data: getQualificationData(),
          ...getStoredUtm(),
        }),
      });
      if (res.ok) {
        setFormState("success");
        setName(""); setEmail(""); setPhone(""); setMessage(""); setTouched({});
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  };

  // Average sub-ratings
  const ratedComm = reviews.filter((r) => r.communication_rating);
  const ratedExp = reviews.filter((r) => r.expertise_rating);
  const ratedVal = reviews.filter((r) => r.value_for_money_rating);
  const avgComm = ratedComm.length ? ratedComm.reduce((s, r) => s + (r.communication_rating || 0), 0) / ratedComm.length : 0;
  const avgExp = ratedExp.length ? ratedExp.reduce((s, r) => s + (r.expertise_rating || 0), 0) / ratedExp.length : 0;
  const avgVal = ratedVal.length ? ratedVal.reduce((s, r) => s + (r.value_for_money_rating || 0), 0) / ratedVal.length : 0;

  const vConfig = getVerificationConfig(pro.type);
  const vLinks = getVerificationLinks(pro.type, pro.location_state || undefined);
  const credentialNumber = pro.afsl_number || pro.registration_number;
  const firstName = pro.name.split(" ")[0];
  const initials = pro.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-20">
      <div className="container-custom max-w-[1280px] py-5 md:py-8">

        {/* ── Breadcrumb ─────────────────────────────── */}
        <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-5">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <Icon name="chevron-right" size={14} className="text-slate-300" />
          <Link href="/advisors" className="hover:text-slate-700 transition-colors">Advisors</Link>
          <Icon name="chevron-right" size={14} className="text-slate-300" />
          <span className="text-slate-700 font-medium truncate">{pro.name}</span>
        </nav>

        {/* ── HERO CARD ──────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          {/* Banner */}
          <div className="h-36 md:h-52 bg-gradient-to-br from-amber-500 via-amber-600 to-indigo-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(99,102,241,0.35),transparent_50%)]" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/10 to-transparent" />
          </div>

          {/* Profile content */}
          <div className="px-5 md:px-10 pb-7 -mt-14 md:-mt-20 relative">
            <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-7">
              {/* Avatar */}
              {pro.photo_url ? (
                <Image
                  src={pro.photo_url}
                  alt={pro.name}
                  width={160}
                  height={160}
                  className="w-24 h-24 md:w-40 md:h-40 rounded-2xl object-cover shrink-0 ring-4 ring-white shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-3xl md:text-5xl font-black text-white shrink-0 ring-4 ring-white shadow-xl">
                  {initials}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0 md:pb-2">
                {/* Name + badges */}
                <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                  <h1 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">{pro.name}</h1>
                  {pro.verified && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">
                      <Icon name="shield-check" size={12} />
                      Verified
                    </span>
                  )}
                  {pro.accepting_new_clients === false && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold shrink-0">
                      Not accepting clients
                    </span>
                  )}
                </div>

                {/* Role + firm */}
                <p className="text-base md:text-lg font-medium mb-3">
                  <span className="text-amber-700 font-bold">{typeLabel}</span>
                  {pro.firm_name && (
                    <>
                      <span className="text-slate-300 mx-2">·</span>
                      <span className="text-slate-600">{pro.firm_name}</span>
                    </>
                  )}
                </p>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 mb-4">
                  {pro.location_display && (
                    <span className="flex items-center gap-1.5">
                      <Icon name="map-pin" size={14} className="text-slate-400" />
                      {pro.location_display}
                    </span>
                  )}
                  {pro.rating > 0 && pro.review_count > 0 && (
                    <a href="#reviews" className="flex items-center gap-1.5 hover:text-amber-700 transition-colors">
                      <Stars rating={pro.rating} className="text-base" />
                      <span className="font-bold text-slate-700">{pro.rating.toFixed(1)}</span>
                      <span className="text-slate-400">({pro.review_count} {pro.review_count === 1 ? "review" : "reviews"})</span>
                    </a>
                  )}
                  {pro.years_experience ? (
                    <span className="flex items-center gap-1.5">
                      <Icon name="clock" size={14} className="text-slate-400" />
                      {pro.years_experience}+ yrs experience
                    </span>
                  ) : null}
                  {pro.avg_response_minutes != null && pro.avg_response_minutes <= 120 && (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                      <Icon name="zap" size={14} />
                      Responds fast
                    </span>
                  )}
                  {pro.avg_response_minutes != null && pro.avg_response_minutes > 120 && pro.avg_response_minutes <= 1440 && (
                    <span className="flex items-center gap-1.5 text-sky-600 font-semibold">
                      <Icon name="clock" size={14} />
                      Responds within 24 hrs
                    </span>
                  )}
                </div>

                {/* Meeting types */}
                {(pro.meeting_types)?.length ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(pro.meeting_types!).map((mt) => (
                      <span key={mt} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        <Icon name={mt === "video" ? "video" : mt === "phone" ? "phone" : "map-pin"} size={11} />
                        {mt === "in-person" ? "In-Person" : mt === "video" ? "Video Call" : mt === "phone" ? "Phone" : mt}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Desktop CTAs */}
                <div className="hidden md:flex items-center gap-3 flex-wrap">
                  <a
                    href="#contact"
                    className="px-7 py-3 bg-amber-600 text-white font-bold text-sm rounded-xl hover:bg-amber-500 transition-all shadow-md shadow-amber-200/50 active:scale-[0.98]"
                  >
                    Request Free Consultation
                  </a>
                  {pro.booking_link && (
                    <a href={pro.booking_link} target="_blank" rel="noopener noreferrer"
                      className="px-5 py-3 bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all">
                      Book a Call
                    </a>
                  )}
                  {pro.phone && (
                    <a href={`tel:${pro.phone.replace(/\s/g, "")}`}
                      className="px-5 py-3 bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-2">
                      <Icon name="phone" size={14} className="text-slate-400" />
                      {pro.phone}
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: `${pro.name} — ${typeLabel}`, url: window.location.href });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                      }
                    }}
                    className="px-4 py-3 bg-white border border-slate-200 text-slate-400 text-sm rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all"
                    title="Share profile"
                  >
                    <Icon name="share-2" size={15} />
                  </button>
                </div>
              </div>

              {/* Rating badge — desktop */}
              {pro.rating > 0 && pro.review_count > 0 && (
                <div className="hidden md:flex flex-col items-center justify-center bg-amber-50 border border-amber-100 rounded-2xl px-7 py-5 shrink-0 text-center">
                  <div className="text-5xl font-black text-amber-600 leading-none mb-1">{pro.rating.toFixed(1)}</div>
                  <Stars rating={pro.rating} className="text-xl mb-1" />
                  <div className="text-xs text-slate-500">{pro.review_count} {pro.review_count === 1 ? "review" : "reviews"}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick-facts bar */}
          <div className="border-t border-slate-100 bg-slate-50/60 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
            {[
              { icon: "briefcase", label: "Type", value: typeLabel },
              { icon: "map-pin", label: "Location", value: pro.location_display || "Australia" },
              {
                icon: "coins",
                label: "Fees",
                value: pro.initial_consultation_free ? "Free initial consult" : pro.fee_description || "Contact for pricing",
              },
              {
                icon: "shield-check",
                label: "Licence",
                value: credentialNumber ? `${vConfig.primaryLicence.code} ${credentialNumber}` : "Verified",
              },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 px-5 py-4">
                <Icon name={f.icon} size={16} className="text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{f.label}</div>
                  <div className="text-xs md:text-sm font-semibold text-slate-700 truncate">{f.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Special Offer */}
        {pro.offer_active && pro.offer_text && (
          <div className="flex items-center gap-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl px-5 py-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
              <Icon name="tag" size={18} className="text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-0.5">Special Offer</p>
              <p className="text-sm font-bold text-amber-900">{pro.offer_text}</p>
              {pro.offer_terms && <p className="text-xs text-amber-600 mt-0.5">{pro.offer_terms}</p>}
            </div>
          </div>
        )}

        {/* ── TWO-COLUMN LAYOUT ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* ── LEFT: Main content ─────────────────── */}
          <div className="space-y-5">

            {/* Firm / Team */}
            {firm && pro.account_type === "firm_member" ? (
              <SectionCard title="Practice" icon="building">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Icon name="building" size={22} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link href={`/firm/${firm.slug}`} className="text-base font-bold text-slate-900 hover:text-blue-700 transition-colors">
                        {firm.name}
                      </Link>
                      {pro.is_firm_admin && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Principal</span>
                      )}
                    </div>
                    {firm.bio && <p className="text-sm text-slate-500 mb-2 line-clamp-2">{firm.bio}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      {firm.afsl_number && <span>AFSL {firm.afsl_number}</span>}
                      {firm.abn && <span>ABN {firm.abn}</span>}
                      <span className="text-blue-600 font-semibold">{teamMembers.length + 1} team members</span>
                      <Link href={`/firm/${firm.slug}`} className="text-blue-600 font-semibold hover:text-blue-800">
                        View firm profile →
                      </Link>
                    </div>
                  </div>
                </div>
                {teamMembers.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Other team members</p>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {teamMembers.map((m) => (
                        <Link key={m.id} href={`/advisor/${m.slug}`}
                          className="shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all">
                          {m.photo_url ? (
                            <img src={m.photo_url} alt={m.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                              {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-slate-800">{m.name}</div>
                            <div className="text-[0.65rem] text-slate-400">{PROFESSIONAL_TYPE_LABELS[m.type as keyof typeof PROFESSIONAL_TYPE_LABELS]}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            ) : !pro.firm_name ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                  <Icon name="user" size={13} className="text-slate-500" />
                </div>
                <span className="text-sm font-semibold text-slate-600">Independent Advisor</span>
                <span className="text-xs text-slate-400 hidden md:block">— Not aligned to any product provider or dealer group</span>
              </div>
            ) : null}

            {/* About */}
            {pro.bio && (
              <SectionCard id="about" title={`About ${pro.name}`} icon="user">
                <p className={`text-sm md:text-base text-slate-600 leading-relaxed whitespace-pre-line ${!bioExpanded && pro.bio.length > 400 ? "line-clamp-5" : ""}`}>
                  {pro.bio}
                </p>
                {pro.bio.length > 400 && (
                  <button
                    onClick={() => setBioExpanded((b) => !b)}
                    className="text-sm font-bold text-amber-600 hover:text-amber-800 mt-3 transition-colors"
                  >
                    {bioExpanded ? "Show less ↑" : "Read more ↓"}
                  </button>
                )}
              </SectionCard>
            )}

            {/* Who I work with */}
            {pro.ideal_client && (
              <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="user" size={18} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 mb-1">Who I Work With</h3>
                  <p className="text-sm text-amber-700 leading-relaxed">{pro.ideal_client!}</p>
                </div>
              </div>
            )}

            {/* Specialties */}
            {pro.specialties.length > 0 && (
              <SectionCard title="Specialties" icon="target">
                <div className="flex flex-wrap gap-2.5">
                  {pro.specialties.map((s) => (
                    <span key={s} className="text-sm font-semibold px-4 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:border-amber-300 transition-colors">
                      {s}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Qualifications, Education & Memberships */}
            {((pro.qualifications)?.length || pro.years_experience || (pro.memberships)?.length || (pro.education)?.length) && (
              <SectionCard title="Qualifications & Credentials" icon="award">
                <div className="space-y-5">
                  {(pro.years_experience || (pro.qualifications)?.length) && (
                    <div className="space-y-3">
                      {pro.years_experience ? (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            <Icon name="clock" size={15} className="text-slate-500" />
                          </div>
                          <span className="text-sm text-slate-700">
                            <strong className="text-slate-900">{pro.years_experience}+ years</strong> of professional experience
                          </span>
                        </div>
                      ) : null}
                      {(pro.qualifications)?.map((q) => (
                        <div key={q} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                            <Icon name="award" size={15} className="text-amber-500" />
                          </div>
                          <span className="text-sm text-slate-700">{q}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(pro.education)?.length ? (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Education</h3>
                      <div className="space-y-3">
                        {(pro.education!).map((e, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon name="graduation-cap" size={15} className="text-blue-500" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{e.degree}</p>
                              <p className="text-xs text-slate-500">{e.institution}{e.year ? ` · ${e.year}` : ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(pro.memberships)?.length ? (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Professional Memberships</h3>
                      <div className="flex flex-wrap gap-2.5">
                        {(pro.memberships!).map((m) => (
                          <span key={m} className="text-sm font-bold px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            )}

            {/* Languages & Service Areas */}
            {((pro.languages)?.length && (pro.languages!).length > 1) || (pro.service_areas)?.length ? (
              <SectionCard title="Languages & Service Areas" icon="globe">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {(pro.languages)?.length && (pro.languages!).length > 1 ? (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Languages</h3>
                      <div className="flex flex-wrap gap-2">
                        {(pro.languages!).map((l) => (
                          <span key={l} className="text-sm px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">{l}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {(pro.service_areas)?.length ? (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Service Areas</h3>
                      <div className="flex flex-wrap gap-2">
                        {(pro.service_areas!).map((a) => (
                          <span key={a} className="text-sm px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600">{a}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            ) : null}

            {/* Regulatory Credentials */}
            <div id="credentials" className="bg-emerald-50 border border-emerald-200 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-emerald-200 bg-emerald-100/60">
                <div className="w-9 h-9 rounded-xl bg-emerald-200 flex items-center justify-center shrink-0">
                  <Icon name="shield-check" size={17} className="text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-emerald-900">Regulatory Credentials</h2>
                  <p className="text-xs text-emerald-600">Verified against official government registers</p>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-emerald-800 mb-5 leading-relaxed">
                  {credentialNumber ? (
                    <>
                      {pro.name} holds {vConfig.primaryLicence.code}{" "}
                      <strong>{credentialNumber}</strong>, verified against the {vConfig.primaryLicence.regulatorShort} register.
                    </>
                  ) : (
                    vConfig.disclosure
                  )}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-xl p-4 border border-emerald-100">
                    <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Primary Licence</div>
                    <div className="text-sm font-bold text-slate-800 mb-0.5">{vConfig.primaryLicence.name}</div>
                    <div className="text-xs text-slate-500">Regulated by {vConfig.primaryLicence.regulatorShort}</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-emerald-100">
                    <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Insurance</div>
                    <div className="text-sm font-bold text-slate-800 mb-0.5">{vConfig.insurance.split(" — ")[0]}</div>
                    <div className="text-xs text-slate-500">{vConfig.edr.split(".")[0]}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {vLinks.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                      <Icon name="external-link" size={12} className="text-emerald-500" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Fee Structure */}
            {(pro.hourly_rate_cents || pro.flat_fee_cents || pro.aum_percentage) && (
              <SectionCard title="Fee Structure" icon="coins">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  {pro.initial_consultation_free && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1.5">Initial Consult</div>
                      <div className="text-2xl font-black text-emerald-700">Free</div>
                    </div>
                  )}
                  {pro.hourly_rate_cents ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1.5">Hourly Rate</div>
                      <div className="text-2xl font-black text-amber-700">${(pro.hourly_rate_cents / 100).toLocaleString()}</div>
                    </div>
                  ) : null}
                  {pro.flat_fee_cents ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1.5">Flat Fee</div>
                      <div className="text-2xl font-black text-amber-700">${(pro.flat_fee_cents / 100).toLocaleString()}</div>
                    </div>
                  ) : null}
                  {pro.aum_percentage ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1.5">AUM Fee</div>
                      <div className="text-2xl font-black text-amber-700">{pro.aum_percentage}%</div>
                      <div className="text-xs text-amber-600 mt-0.5">of assets managed</div>
                    </div>
                  ) : null}
                </div>
                {pro.fee_structure && (
                  <p className="text-xs text-slate-400">
                    Fee model:{" "}
                    <span className="font-semibold text-slate-600">
                      {pro.fee_structure === "percentage of AUM"
                        ? "% of Assets Under Management"
                        : pro.fee_structure.charAt(0).toUpperCase() + pro.fee_structure.slice(1)}
                    </span>
                  </p>
                )}
              </SectionCard>
            )}

            {/* Intro Video */}
            {pro.intro_video_url && (
              <SectionCard title="Introduction Video" icon="video">
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100">
                  <iframe
                    src={(pro.intro_video_url!).replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </SectionCard>
            )}

            {/* Testimonials */}
            {(pro.testimonials)?.length ? (
              <SectionCard title="Client Testimonials" icon="star">
                <div className="space-y-5">
                  {(pro.testimonials!).map((t, i) => (
                    <blockquote key={i} className="relative pl-5 border-l-4 border-amber-300">
                      <p className="text-sm md:text-base text-slate-600 italic leading-relaxed">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                      <footer className="text-xs text-slate-400 mt-2 font-semibold">
                        — {t.author}{t.date ? ` · ${t.date}` : ""}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {/* FAQ */}
            {(pro.faqs)?.length ? (
              <SectionCard title="Frequently Asked Questions" icon="chevron-down">
                <div className="space-y-2">
                  {(pro.faqs!).map((faq, i) => (
                    <details key={i} className="group">
                      <summary className="flex items-center justify-between cursor-pointer py-3.5 px-4 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors list-none">
                        <span>{faq.q}</span>
                        <Icon name="chevron-down" size={16} className="text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-3" />
                      </summary>
                      <div className="px-4 py-3 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
                    </details>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            {/* Booking Widget */}
            <div>
              <BookingWidget advisorSlug={pro.slug} advisorName={pro.name} />
            </div>

            {/* ── Reviews ────────────────────────────── */}
            <div id="reviews" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-24">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Icon name="star" size={16} className="text-amber-500" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    Reviews
                    {reviews.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-slate-400">({reviews.length})</span>
                    )}
                  </h2>
                </div>
                {!reviewFormOpen && reviewState !== "success" && (
                  <button onClick={() => setReviewFormOpen(true)}
                    className="text-sm font-bold text-amber-700 hover:text-amber-600 transition-colors">
                    Write a Review
                  </button>
                )}
              </div>
              <div className="p-6">
                {/* Rating summary */}
                {reviews.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-6 pb-6 mb-6 border-b border-slate-100">
                    <div className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-1 shrink-0">
                      <div className="text-6xl font-black text-amber-600 leading-none">{pro.rating.toFixed(1)}</div>
                      <div>
                        <Stars rating={pro.rating} className="text-xl sm:text-2xl" />
                        <div className="text-xs text-slate-400 text-center mt-0.5">{reviews.length} reviews</div>
                      </div>
                    </div>
                    {(avgComm > 0 || avgExp > 0 || avgVal > 0) && (
                      <div className="flex-1 space-y-3 my-auto">
                        {avgComm > 0 && <RatingBar label="Communication" value={Math.round(avgComm * 10) / 10} />}
                        {avgExp > 0 && <RatingBar label="Expertise" value={Math.round(avgExp * 10) / 10} />}
                        {avgVal > 0 && <RatingBar label="Value for Money" value={Math.round(avgVal * 10) / 10} />}
                      </div>
                    )}
                  </div>
                )}

                {/* Reviews list */}
                {reviews.length > 0 ? (
                  <div className="space-y-6 mb-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-black text-slate-600 shrink-0">
                            {r.reviewer_name[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="text-sm font-bold text-slate-800">{r.reviewer_name}</span>
                              {r.verified && (
                                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">Verified</span>
                              )}
                              {r.used_services && (
                                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">Used Services</span>
                              )}
                              <span className="text-xs text-slate-400 ml-auto">
                                {new Date(r.created_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                              </span>
                            </div>
                            <Stars rating={r.rating} className="text-base" />
                          </div>
                        </div>
                        {r.title && <p className="text-sm font-bold text-slate-800 mb-1.5">{r.title}</p>}
                        <p className="text-sm text-slate-600 leading-relaxed">{r.body}</p>
                        {(r.communication_rating || r.expertise_rating || r.value_for_money_rating) && (
                          <div className="flex flex-wrap gap-4 mt-3">
                            {r.communication_rating ? (
                              <span className="text-xs text-slate-400">Comms: <span className="text-amber-500">{"★".repeat(r.communication_rating)}</span></span>
                            ) : null}
                            {r.expertise_rating ? (
                              <span className="text-xs text-slate-400">Expertise: <span className="text-amber-500">{"★".repeat(r.expertise_rating)}</span></span>
                            ) : null}
                            {r.value_for_money_rating ? (
                              <span className="text-xs text-slate-400">Value: <span className="text-amber-500">{"★".repeat(r.value_for_money_rating)}</span></span>
                            ) : null}
                          </div>
                        )}
                        <a
                          href={`mailto:moderation@invest.com.au?subject=Flag+review+%23${r.id}&body=I+would+like+to+flag+review+%23${r.id}+on+the+profile+of+${encodeURIComponent(pro.name)}.+Reason:%0A%0A`}
                          className="inline-block text-[0.6rem] text-slate-300 hover:text-slate-500 mt-2 transition-colors"
                          aria-label="Flag this review for moderation"
                        >
                          Flag review
                        </a>
                      </div>
                    ))}
                  </div>
                ) : !reviewFormOpen && reviewState !== "success" ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Icon name="star" size={24} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-600 mb-1">No reviews yet</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Be the first to share your experience with {firstName}
                    </p>
                    <button
                      onClick={() => setReviewFormOpen(true)}
                      className="px-5 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-500 transition-colors"
                    >
                      Write a Review
                    </button>
                  </div>
                ) : null}

                {reviewState === "success" ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                    <Icon name="check-circle" size={26} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-emerald-800">Review submitted!</p>
                    <p className="text-xs text-emerald-600 mt-1">It will appear once verified (usually within 48 hours).</p>
                  </div>
                ) : reviewFormOpen ? (
                  <AdvisorReviewForm
                    professionalId={pro.id}
                    advisorName={pro.name}
                    onSuccess={() => { setReviewState("success"); setReviewFormOpen(false); }}
                    onCancel={() => setReviewFormOpen(false)}
                  />
                ) : null}
              </div>
            </div>

            {/* Expert Articles */}
            {expertArticles.length > 0 && (
              <SectionCard title={`Expert Insights by ${firstName}`} icon="file-text">
                <div className="space-y-3">
                  {expertArticles.map((article) => (
                    <a key={article.id} href={`/expert/${article.slug}`}
                      className="flex items-start gap-4 p-4 bg-slate-50 border border-transparent rounded-xl hover:bg-amber-50 hover:border-amber-200 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-amber-200 transition-colors">
                        <Icon name="file-text" size={17} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2 mb-1">
                          {article.title}
                        </h3>
                        {article.excerpt && (
                          <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">{article.excerpt}</p>
                        )}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {article.category && (
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">{article.category}</span>
                          )}
                          {article.reading_time_mins ? (
                            <span className="text-xs text-slate-400">{article.reading_time_mins} min read</span>
                          ) : null}
                          {article.published_at && (
                            <span className="text-xs text-slate-400">
                              {new Date(article.published_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <Icon name="arrow-right" size={16} className="text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Similar advisors */}
            {similar.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-slate-800 mb-3">
                  Other {PROFESSIONAL_TYPE_LABELS[pro.type]}s
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {similar.map((s) => (
                    <Link key={s.id} href={`/advisor/${s.slug}`}
                      className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:border-amber-200 transition-all group">
                      <div className="flex items-center gap-3 mb-3">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center text-sm font-black text-amber-600 shrink-0">
                            {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate group-hover:text-amber-700 transition-colors">{s.name}</div>
                          {s.firm_name && <div className="text-xs text-slate-400 truncate">{s.firm_name}</div>}
                        </div>
                      </div>
                      {s.location_display && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                          <Icon name="map-pin" size={11} />
                          {s.location_display}
                        </div>
                      )}
                      {s.rating > 0 && s.review_count > 0 ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Stars rating={s.rating} className="text-sm" />
                          <span className="font-bold text-slate-600">{s.rating}</span>
                          <span className="text-slate-400">· {s.review_count} reviews</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">{s.fee_description || "Contact for pricing"}</div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance */}
            <div className="text-xs text-slate-400 leading-relaxed space-y-2 pt-2 pb-4">
              <p>
                Invest.com.au does not provide financial advice, deal in financial products, or hold an Australian Financial Services Licence (AFSL).
                We are an information and directory service only. We facilitate connections between users and registered financial professionals but do not supervise, endorse, or take responsibility for any advice provided.
              </p>
              <p>
                Always verify an advisor&apos;s credentials independently on the{" "}
                <a href="https://asic.gov.au/online-services/search-asics-registers/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
                  ASIC Financial Advisers Register
                </a>{" "}
                or the{" "}
                <a href="https://www.tpb.gov.au/public-register" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
                  TPB Register
                </a>{" "}
                before engaging their services. If you have a complaint, contact{" "}
                <a href="https://www.afca.org.au" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">
                  AFCA
                </a>{" "}
                (1800 931 678).
              </p>
            </div>
          </div>

          {/* ── RIGHT: Sticky sidebar ──────────────── */}
          <div className="lg:sticky lg:top-24 space-y-4">

            {/* Already matched */}
            {alreadyMatched && formState !== "success" && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
                <Icon name="check-circle" size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Already matched with {firstName}</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Already notified via the quiz. Add more details below if needed.
                  </p>
                </div>
              </div>
            )}

            {/* ── Contact form ── */}
            <div id="contact" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden scroll-mt-24">
              {/* Card header */}
              <div className="bg-gradient-to-br from-amber-600 to-amber-500 px-6 py-5">
                {pro.initial_consultation_free && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white mb-3">
                    <Icon name="check" size={11} />
                    Free initial consultation
                  </span>
                )}
                <h2 className="text-lg font-black text-white mb-0.5">Contact {firstName}</h2>
                <p className="text-amber-100 text-sm">No obligation. Details shared only with {firstName}.</p>
              </div>

              <div className="p-5">
                {formState === "success" ? (
                  <div className="text-center py-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <Icon name="check" size={26} className="text-emerald-600" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 mb-1">Enquiry Sent!</h3>
                    <p className="text-sm text-slate-500 mb-5">
                      {firstName} will typically respond within 24 hours.
                    </p>
                    <div className="space-y-2.5 text-left mb-5">
                      {[
                        "Email confirmation sent to you",
                        `${firstName} reviews your request`,
                        "They'll contact you to arrange a consult",
                        "No obligation to proceed",
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-black text-emerald-600">{i + 1}</span>
                          </div>
                          {step}
                        </div>
                      ))}
                    </div>
                    <Link href="/advisors" className="text-sm font-bold text-amber-600 hover:text-amber-800 transition-colors">
                      Browse more advisors →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Your name *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                        placeholder="Full name"
                        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 focus:bg-white transition-all ${
                          nameError ? "border-red-300 bg-red-50" : "border-slate-200"
                        }`}
                      />
                      {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                        placeholder="your@email.com"
                        className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 focus:bg-white transition-all ${
                          emailError ? "border-red-300 bg-red-50" : "border-slate-200"
                        }`}
                      />
                      {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Phone <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="04XX XXX XXX"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        What do you need help with? <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Brief description of your situation..."
                        rows={3}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-400 focus:bg-white transition-all resize-none"
                      />
                    </div>
                    {formError && <p className="text-xs text-red-500 font-semibold">{formError}</p>}
                    <button
                      onClick={handleSubmit}
                      disabled={formState === "submitting"}
                      className="w-full py-3.5 bg-amber-600 text-white font-black text-sm rounded-xl hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-amber-200/60"
                    >
                      {formState === "submitting" ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        `Send Enquiry to ${firstName}`
                      )}
                    </button>
                    {formState === "error" && (
                      <p className="text-xs text-center text-red-500">
                        Something went wrong.{" "}
                        <button onClick={() => setFormState("idle")} className="underline font-semibold">
                          Try again
                        </button>
                      </p>
                    )}
                    <p className="text-[0.68rem] text-slate-400 text-center leading-relaxed">
                      By submitting, you consent to sharing your details with {firstName}.
                      No obligation. See our{" "}
                      <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Trust signals */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Why trust this profile?</h3>
              <div className="space-y-3.5">
                {pro.verified && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon name="shield-check" size={16} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Independently verified</p>
                      <p className="text-xs text-slate-400">Credentials checked by our team</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Icon name="check-circle" size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Registered professional</p>
                    <p className="text-xs text-slate-400">{vConfig.primaryLicence.name}</p>
                  </div>
                </div>
                {pro.review_count > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <Icon name="star" size={16} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{pro.review_count} verified {pro.review_count === 1 ? "review" : "reviews"}</p>
                      <p className="text-xs text-slate-400">Average rating: {pro.rating.toFixed(1)} / 5</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact details */}
            {(pro.phone || pro.website || pro.linkedin_url) && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Contact Details</h3>
                <div className="space-y-2">
                  {pro.phone && (
                    <a href={`tel:${pro.phone.replace(/\s/g, "")}`}
                      className="flex items-center gap-3 py-2 text-sm text-slate-700 hover:text-amber-700 transition-colors group">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-amber-50 flex items-center justify-center shrink-0 transition-colors">
                        <Icon name="phone" size={15} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                      </div>
                      <span className="font-semibold">{pro.phone}</span>
                    </a>
                  )}
                  {pro.website && (
                    <a
                      href={pro.website.startsWith("http") ? pro.website : `https://${pro.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 py-2 text-sm text-slate-700 hover:text-amber-700 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-amber-50 flex items-center justify-center shrink-0 transition-colors">
                        <Icon name="globe" size={15} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                      </div>
                      <span className="font-semibold">Visit website</span>
                    </a>
                  )}
                  {pro.linkedin_url && (
                    <a href={pro.linkedin_url!} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 py-2 text-sm text-slate-700 hover:text-blue-700 transition-colors group">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center shrink-0 transition-colors">
                        <Icon name="linkedin" size={15} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <span className="font-semibold">LinkedIn Profile</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Related Platforms */}
            {TYPE_TO_PLATFORMS[pro.type]?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Related Platforms</h3>
                <div className="space-y-1">
                  {TYPE_TO_PLATFORMS[pro.type].map((p) => (
                    <Link key={p.href} href={p.href}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-semibold text-slate-700 hover:text-amber-700 hover:bg-amber-50 group transition-colors">
                      <span>{p.label}</span>
                      <Icon name="arrow-right" size={14} className="text-slate-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── STICKY MOBILE CTA ──────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40">
        <div className="flex items-center gap-3 px-4 py-3">
          {pro.photo_url ? (
            <img src={pro.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-sm font-black text-amber-600 shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{pro.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {pro.initial_consultation_free ? "Free consultation" : pro.fee_description || typeLabel}
            </p>
          </div>
          <a
            href="#contact"
            className="shrink-0 px-5 py-2.5 bg-amber-600 text-white text-sm font-black rounded-xl hover:bg-amber-500 transition-colors active:scale-[0.98]"
          >
            Enquire Free
          </a>
          {pro.phone && (
            <a
              href={`tel:${pro.phone.replace(/\s/g, "")}`}
              className="shrink-0 w-11 h-11 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <Icon name="phone" size={18} className="text-slate-600" />
            </a>
          )}
        </div>
      </div>

      {/* ── STICKY DESKTOP BAR ─────────────────────── */}
      <div className="hidden lg:block fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-40">
        <div className="container-custom max-w-[1280px] py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {pro.photo_url && (
              <Image src={pro.photo_url} alt="" width={38} height={38} className="rounded-xl object-cover shrink-0" />
            )}
            <div>
              <span className="text-sm font-black text-slate-900">{pro.name}</span>
              {pro.verified && (
                <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Verified</span>
              )}
              {pro.firm_name && <span className="ml-2 text-xs text-slate-400">{pro.firm_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pro.phone && (
              <a href={`tel:${pro.phone.replace(/\s/g, "")}`}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:border-slate-300 transition-all flex items-center gap-2">
                <Icon name="phone" size={14} />
                {pro.phone}
              </a>
            )}
            <a
              href="#contact"
              className="px-7 py-2.5 bg-amber-600 text-white font-black text-sm rounded-xl hover:bg-amber-500 transition-all shadow-sm shadow-amber-200/50"
            >
              Request Free Consultation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
