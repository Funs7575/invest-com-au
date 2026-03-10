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
  buyers_agent: [
    { label: "Property Investing", href: "/best/property-investing" },
  ],
  estate_planner: [
    { label: "Best Super Funds", href: "/super" },
  ],
  insurance_broker: [
    { label: "Best Super Funds", href: "/super" },
  ],
  aged_care_advisor: [
    { label: "Best Super Funds", href: "/super" },
    { label: "Best Savings Accounts", href: "/savings" },
  ],
  debt_counsellor: [
    { label: "High-Interest Savings", href: "/best/high-interest-savings" },
    { label: "Savings Accounts", href: "/savings" },
  ],
};

function renderStars(rating: number) {
  return "★".repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? "½" : "");
}

function BioSection({ name, bio }: { name: string; bio: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = bio.length > 300;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 mb-4 md:mb-6">
      <h2 className="text-sm md:text-base font-bold text-slate-900 mb-2">About {name}</h2>
      <p className={`text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-line ${!expanded && isLong ? "line-clamp-4 md:line-clamp-none" : ""}`}>
        {bio}
      </p>
      {isLong && !expanded && (
        <button onClick={() => setExpanded(true)} className="md:hidden text-xs font-semibold text-violet-600 hover:text-violet-800 mt-1">
          Read more
        </button>
      )}
    </div>
  );
}

type ExpertArticle = { id: number; title: string; slug: string; excerpt: string; category: string; published_at: string; reading_time_mins: number | null; view_count: number };

export default function AdvisorProfileClient({ professional: pro, similar, reviews = [], teamMembers = [], firm, expertArticles = [] }: { professional: Professional; similar: Professional[]; reviews?: ProfessionalReview[]; teamMembers?: Professional[]; firm?: AdvisorFirm | null; expertArticles?: ExpertArticle[] }) {
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Review form state
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewState, setReviewState] = useState<"idle" | "success">("idle");

  // Track profile view
  useEffect(() => {
    trackEvent('advisor_profile_view', {
      professional_id: pro.id,
      advisor_slug: pro.slug,
      type: pro.type,
      has_booking_link: !!pro.booking_link,
    }, `/advisor/${pro.slug}`);
  }, [pro.slug, pro.id, pro.type, pro.booking_link]);

  const typeLabel = PROFESSIONAL_TYPE_LABELS[pro.type] || "Financial Professional";

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const nameError = touched.name && !name.trim() ? "Name is required" : "";
  const emailError = touched.email && !email.trim() ? "Email is required" : touched.email && !isValidEmail(email) ? "Enter a valid email" : "";

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
          // Lead quality signals
          pages_visited: typeof window !== 'undefined' ? parseInt(sessionStorage.getItem('pages_visited') || '1') : 1,
          quiz_completed: typeof window !== 'undefined' ? !!sessionStorage.getItem('quiz_completed') : false,
          calculator_used: typeof window !== 'undefined' ? !!sessionStorage.getItem('calculator_used') : false,
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

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl">
        {/* Breadcrumb */}
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/advisors" className="hover:text-slate-900">Advisors</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">{pro.name}</span>
        </nav>

        {/* Profile header */}
        <div className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4 md:mb-6">
          <div className="h-2 bg-gradient-to-r from-violet-600 via-violet-500 to-violet-400" />
          <div className="p-4 md:p-6">
          <div className="flex gap-4">
            {/* Avatar */}
            {pro.photo_url ? (
              <Image src={pro.photo_url} alt={pro.name} width={80} height={80} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shrink-0 ring-2 ring-violet-100" />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center text-lg md:text-xl font-bold text-violet-600 shrink-0 ring-2 ring-violet-100">
                {pro.name.split(" ").map((n) => n[0]).join("")}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg md:text-2xl font-extrabold text-slate-900 truncate">{pro.name}</h1>
                {pro.verified && (
                  <span className="shrink-0 text-[0.62rem] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Verified</span>
                )}
              </div>
              {pro.firm_name && <div className="text-xs md:text-sm text-slate-600 mb-1">{pro.firm_name}</div>}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[0.65rem] md:text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{typeLabel}</span>
                {pro.location_display && (
                  <span className="text-[0.65rem] md:text-xs text-slate-400">{pro.location_display}</span>
                )}
              </div>
              {pro.rating > 0 && (
                <div className="mt-1.5 text-xs">
                  <span className="text-amber-500">{renderStars(pro.rating)}</span>
                  <span className="text-slate-400 ml-1">{pro.rating}/5 ({pro.review_count} review{pro.review_count !== 1 ? "s" : ""})</span>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Firm / Independent badge */}
        {firm && pro.account_type === "firm_member" ? (
          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-4 md:p-5 mb-4 md:mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <Icon name="building" size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/firm/${firm.slug}`} className="text-sm md:text-base font-bold text-slate-900 hover:text-blue-700 transition-colors">
                    {firm.name}
                  </Link>
                  {pro.is_firm_admin && (
                    <span className="text-[0.56rem] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">Principal</span>
                  )}
                </div>
                {firm.bio && <p className="text-[0.62rem] md:text-xs text-slate-500 line-clamp-2">{firm.bio}</p>}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {firm.afsl_number && <span className="text-[0.56rem] text-slate-400">AFSL {firm.afsl_number}</span>}
                  {firm.abn && <span className="text-[0.56rem] text-slate-400">ABN {firm.abn}</span>}
                  <span className="text-[0.56rem] font-semibold text-blue-600">{teamMembers.length + 1} team member{teamMembers.length > 0 ? "s" : ""}</span>
                  <Link href={`/firm/${firm.slug}`} className="text-[0.56rem] font-semibold text-blue-600 hover:text-blue-800">View firm profile →</Link>
                </div>
              </div>
            </div>
            {/* Team members preview */}
            {teamMembers.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-100">
                <p className="text-[0.56rem] font-bold text-slate-500 uppercase tracking-wider mb-2">Other team members</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {teamMembers.map(m => (
                    <Link key={m.id} href={`/advisor/${m.slug}`} className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                      {m.photo_url ? (
                        <img src={m.photo_url} alt={m.name} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[0.5rem] font-bold text-slate-500">
                          {m.name.split(" ").map(n => n[0]).join("")}
                        </div>
                      )}
                      <div>
                        <div className="text-[0.62rem] font-semibold text-slate-800">{m.name}</div>
                        <div className="text-[0.5rem] text-slate-400">{PROFESSIONAL_TYPE_LABELS[m.type as keyof typeof PROFESSIONAL_TYPE_LABELS]}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : !pro.firm_name && (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg mb-4 md:mb-6">
            <Icon name="user" size={14} className="text-slate-500" />
            <span className="text-[0.62rem] md:text-xs font-semibold text-slate-600">Independent Advisor</span>
            <span className="text-[0.56rem] md:text-[0.62rem] text-slate-400">— Not aligned to any product provider or dealer group</span>
          </div>
        )}

        {/* Quick facts grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
          {[
            { label: "Type", value: typeLabel, icon: "briefcase", accent: "border-t-violet-500" },
            { label: "Location", value: pro.location_display || "Australia", icon: "map-pin", accent: "border-t-blue-500" },
            { label: "Fees", value: pro.fee_description || "Contact for pricing", icon: "coins", accent: "border-t-amber-500" },
            { label: "Licence", value: pro.afsl_number || pro.registration_number || "Verified", icon: "shield-check", accent: "border-t-emerald-500" },
          ].map((f) => (
            <div key={f.label} className={`bg-white border border-slate-200 border-t-2 ${f.accent} rounded-xl p-2.5 md:p-3`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon name={f.icon} size={12} className="text-slate-400" />
                <span className="text-[0.56rem] md:text-[0.62rem] text-slate-400 uppercase font-semibold tracking-wide">{f.label}</span>
              </div>
              <div className="text-xs md:text-sm font-semibold text-slate-800 truncate">{f.value}</div>
            </div>
          ))}
        </div>

        {/* Structured fee breakdown */}
        {(pro.hourly_rate_cents || pro.flat_fee_cents || pro.aum_percentage) && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 mb-4 md:mb-6">
            <h2 className="text-sm md:text-base font-bold text-slate-900 mb-3">Fee Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {pro.hourly_rate_cents && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-[0.56rem] uppercase font-semibold text-amber-600 mb-0.5">Hourly Rate</div>
                  <div className="text-base md:text-lg font-bold text-amber-900">${(pro.hourly_rate_cents / 100).toLocaleString()}</div>
                </div>
              )}
              {pro.flat_fee_cents && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-[0.56rem] uppercase font-semibold text-amber-600 mb-0.5">Flat Fee</div>
                  <div className="text-base md:text-lg font-bold text-amber-900">${(pro.flat_fee_cents / 100).toLocaleString()}</div>
                </div>
              )}
              {pro.aum_percentage && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-[0.56rem] uppercase font-semibold text-amber-600 mb-0.5">AUM Fee</div>
                  <div className="text-base md:text-lg font-bold text-amber-900">{pro.aum_percentage}%</div>
                </div>
              )}
              {pro.initial_consultation_free && (
                <div className="bg-emerald-50 rounded-lg p-3">
                  <div className="text-[0.56rem] uppercase font-semibold text-emerald-600 mb-0.5">Initial Consult</div>
                  <div className="text-base md:text-lg font-bold text-emerald-900">Free</div>
                </div>
              )}
            </div>
            {pro.fee_structure && (
              <p className="text-[0.62rem] md:text-xs text-slate-400 mt-2">
                Fee model: <span className="font-medium text-slate-600">{pro.fee_structure === "percentage of AUM" ? "% of Assets Under Management" : pro.fee_structure.charAt(0).toUpperCase() + pro.fee_structure.slice(1)}</span>
              </p>
            )}
          </div>
        )}

        {/* Trust signals — ASIC verification link */}
        {(pro.afsl_number || pro.registration_number) && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6 flex items-start gap-2.5">
            <Icon name="shield-check" size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs md:text-sm font-bold text-emerald-900 mb-0.5">Credentials Verified</div>
              <p className="text-[0.62rem] md:text-xs text-emerald-700 leading-relaxed">
                {pro.name}&apos;s {pro.afsl_number ? "AFSL" : "registration"} ({pro.afsl_number || pro.registration_number}) has been verified against official records.
                {" "}
                <a
                  href={pro.afsl_number
                    ? `https://asic.gov.au/online-services/search-asics-registers/`
                    : `https://www.tpb.gov.au/public-register`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold hover:text-emerald-900"
                >
                  Verify on {pro.afsl_number ? "ASIC" : "TPB"} Register →
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Special Offer */}
        {pro.offer_active && pro.offer_text && (
          <div className="bg-gradient-to-r from-violet-50 to-violet-100/50 border border-violet-200 rounded-xl p-4 md:p-5 mb-4 md:mb-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-violet-200 flex items-center justify-center shrink-0">
                <Icon name="tag" size={18} className="text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.58rem] font-bold uppercase tracking-wider text-violet-500 mb-0.5">Special Offer</p>
                <p className="text-sm md:text-base font-bold text-violet-900">{pro.offer_text}</p>
                {pro.offer_terms && <p className="text-[0.62rem] md:text-xs text-violet-600 mt-1">{pro.offer_terms}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Contact & Links */}
        {(pro.website || pro.phone) && (
          <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
            {pro.website && (
              <a
                href={pro.website.startsWith("http") ? pro.website : `https://${pro.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all"
              >
                <Icon name="globe" size={14} className="text-slate-400" />
                Visit Website
              </a>
            )}
            {pro.phone && (
              <a
                href={`tel:${pro.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all"
              >
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
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-all"
            >
              <Icon name="share-2" size={14} className="text-slate-400" />
              Share
            </button>
          </div>
        )}

        {/* Bio */}
        {pro.bio && (
          <BioSection name={pro.name} bio={pro.bio} />
        )}

        {/* Specialties */}
        {pro.specialties.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 mb-4 md:mb-6">
            <h2 className="text-sm md:text-base font-bold text-slate-900 mb-2">Specialties</h2>
            <div className="flex flex-wrap gap-2">
              {pro.specialties.map((s) => (
                <span key={s} className="text-xs md:text-sm font-medium px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Booking Widget */}
        <div className="mb-4 md:mb-6">
          <BookingWidget advisorSlug={pro.slug} advisorName={pro.name} />
        </div>

        {/* Enquiry form */}
        <div id="enquiry" className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-4 md:mb-6 scroll-mt-20">
          {formState === "success" ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <Icon name="check" size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1">Enquiry Sent!</h3>
              <p className="text-xs md:text-sm text-slate-500 mb-4">
                {pro.name} will typically respond within 24 hours. Check your email for confirmation.
              </p>
              <div className="bg-slate-50 rounded-lg p-3 text-left text-xs text-slate-600 space-y-1.5 max-w-sm mx-auto">
                <div className="flex items-start gap-2"><span className="text-emerald-500 font-bold mt-0.5">1</span><span>You&apos;ll receive an email confirmation</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-500 font-bold mt-0.5">2</span><span>{pro.name} reviews your request</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-500 font-bold mt-0.5">3</span><span>They&apos;ll contact you to arrange a consultation</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-500 font-bold mt-0.5">4</span><span>No obligation — you decide if it&apos;s a good fit</span></div>
              </div>
              <Link href="/advisors" className="inline-block mt-4 text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors">
                Browse more advisors →
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-sm md:text-lg font-bold text-slate-900 mb-1">Request a Free Consultation</h2>
              <p className="text-[0.65rem] md:text-xs text-slate-400 mb-4">No obligation. Your details are shared only with {pro.name}.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched(p => ({ ...p, name: true }))}
                    placeholder="Full name"
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 ${nameError ? "border-red-300 bg-red-50/50" : "border-slate-200"}`}
                  />
                  {nameError && <p className="text-[0.62rem] text-red-500 mt-0.5">{nameError}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched(p => ({ ...p, email: true }))}
                    placeholder="your@email.com"
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 ${emailError ? "border-red-300 bg-red-50/50" : "border-slate-200"}`}
                  />
                  {emailError && <p className="text-[0.62rem] text-red-500 mt-0.5">{emailError}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="04XX XXX XXX"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">What do you need help with? <span className="text-slate-400 font-normal">(optional)</span></label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Brief description of your situation..."
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-vertical"
                  />
                </div>
                {formError && <p className="text-xs text-red-600 font-medium">{formError}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={!name.trim() || !email.trim() || formState === "submitting"}
                  className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {formState === "submitting" ? "Sending..." : `Send Enquiry to ${pro.name.split(" ")[0]}`}
                </button>

                {formState === "error" && (
                  <div className="text-center">
                    <p className="text-xs text-red-600 mb-2">Something went wrong. Please try again.</p>
                    <button
                      onClick={() => setFormState("idle")}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[0.56rem] md:text-[0.62rem] text-slate-400 text-center mt-3 leading-relaxed">
                By submitting, you agree to our <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>. 
                Your contact details are shared only with {pro.name} for the purpose of this enquiry.
              </p>
            </>
          )}
        </div>

        {/* Reviews section */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm md:text-base font-bold text-slate-900">
              Reviews {reviews.length > 0 && <span className="text-slate-400 font-normal">({reviews.length})</span>}
            </h2>
            {!reviewFormOpen && reviewState !== "success" && (
              <button
                onClick={() => setReviewFormOpen(true)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
              >
                Write a Review
              </button>
            )}
          </div>

          {/* Existing approved reviews */}
          {reviews.length > 0 ? (
            <div className="space-y-3 mb-4">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-slate-100 last:border-b-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-400 text-xs">{renderStars(r.rating)}</span>
                    <span className="text-xs font-semibold text-slate-700">{r.reviewer_name}</span>
                    <span className="text-[0.56rem] text-slate-400">
                      {new Date(r.created_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                    </span>
                    {r.verified && <span className="text-[0.5rem] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">Verified</span>}
                    {r.used_services && <span className="text-[0.5rem] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">Used Services</span>}
                  </div>
                  {/* Sub-ratings */}
                  {(r.communication_rating || r.expertise_rating || r.value_for_money_rating) && (
                    <div className="flex gap-3 mb-1">
                      {r.communication_rating && (
                        <span className="text-[0.56rem] text-slate-400">Communication: <span className="text-amber-500">{renderStars(r.communication_rating)}</span></span>
                      )}
                      {r.expertise_rating && (
                        <span className="text-[0.56rem] text-slate-400">Expertise: <span className="text-amber-500">{renderStars(r.expertise_rating)}</span></span>
                      )}
                      {r.value_for_money_rating && (
                        <span className="text-[0.56rem] text-slate-400">Value: <span className="text-amber-500">{renderStars(r.value_for_money_rating)}</span></span>
                      )}
                    </div>
                  )}
                  {r.title && <div className="text-xs font-semibold text-slate-800 mb-0.5">{r.title}</div>}
                  <p className="text-xs text-slate-600 leading-relaxed">{r.body}</p>
                </div>
              ))}
            </div>
          ) : !reviewFormOpen && reviewState !== "success" ? (
            <p className="text-xs text-slate-400 mb-3">No reviews yet. Be the first to share your experience.</p>
          ) : null}

          {/* Review submission — collapsible "Write a Review" section */}
          {reviewState === "success" ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-emerald-800">Thanks! Your review has been submitted for moderation.</p>
              <p className="text-[0.62rem] text-emerald-600 mt-1">It will appear once verified (usually within 48 hours).</p>
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

        {/* Expert articles by this advisor */}
        {expertArticles.length > 0 && (
          <div className="mb-4 md:mb-6">
            <h2 className="text-sm md:text-base font-bold text-slate-900 mb-3">Expert Insights by {pro.name}</h2>
            <div className="space-y-2.5">
              {expertArticles.map((article) => (
                <a
                  key={article.id}
                  href={`/expert/${article.slug}`}
                  className="block bg-white border border-slate-200 rounded-xl p-3.5 hover:shadow-md hover:border-violet-200 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-violet-700 transition-colors line-clamp-2">{article.title}</h3>
                      {article.excerpt && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{article.excerpt}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {article.category && (
                          <span className="text-[0.58rem] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">{article.category}</span>
                        )}
                        {article.reading_time_mins && (
                          <span className="text-[0.58rem] text-slate-400">{article.reading_time_mins} min read</span>
                        )}
                        {article.published_at && (
                          <span className="text-[0.58rem] text-slate-400">{new Date(article.published_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-violet-500 group-hover:translate-x-0.5 transition-transform mt-1">
                      <Icon name="arrow-right" size={16} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Similar advisors */}
        {similar.length > 0 && (
          <div className="mb-4 md:mb-6">
            <h2 className="text-sm md:text-base font-bold text-slate-900 mb-3">Other {PROFESSIONAL_TYPE_LABELS[pro.type]}s</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={`/advisor/${s.slug}`}
                  className="bg-white border border-slate-200 rounded-xl p-3 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {s.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{s.name}</div>
                      <div className="text-[0.58rem] text-slate-400">{s.location_display}</div>
                    </div>
                  </div>
                  {s.rating > 0 && (
                    <div className="text-[0.58rem] text-slate-400">
                      <span className="text-amber-500">{renderStars(s.rating)}</span> {s.rating} · {s.fee_description}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Platforms */}
        {TYPE_TO_PLATFORMS[pro.type] && TYPE_TO_PLATFORMS[pro.type].length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mb-4 md:mb-6">
            <h2 className="text-sm md:text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Related Platforms
            </h2>
            <p className="text-[0.65rem] md:text-xs text-slate-500 mb-3">
              Compare platforms relevant to the services {pro.name.split(" ")[0]} offers
            </p>
            <div className="flex flex-wrap gap-2">
              {TYPE_TO_PLATFORMS[pro.type].map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:border-slate-400 hover:shadow-sm transition-all"
                >
                  {p.label}
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Compliance */}
        <div className="text-[0.56rem] md:text-xs text-slate-400 text-center leading-relaxed">
          <p>Invest.com.au does not provide financial advice. We facilitate connections between users and registered financial professionals. 
          Verify any advisor&apos;s credentials on the <a href="https://asic.gov.au/online-services/search-asics-registers/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">ASIC Register</a> before engaging their services.</p>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-40 safe-area-pb">
        <div className="flex gap-2">
          {pro.booking_link ? (
            <a
              href={pro.booking_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                fetch("/api/track-event", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ event_type: "booking_click", page: `/advisor/${pro.slug}`, metadata: { advisor: pro.slug, source: "sticky_mobile" } }),
                }).catch(() => {});
              }}
              className="flex-1 py-3 bg-violet-600 text-white font-bold rounded-xl text-sm text-center"
            >
              Book Free Call
            </a>
          ) : (
            <a href="#enquiry" className="flex-1 py-3 bg-violet-600 text-white font-bold rounded-xl text-sm text-center">
              Send Enquiry
            </a>
          )}
          {pro.phone && (
            <a href={`tel:${pro.phone}`} className="px-4 py-3 border border-slate-200 rounded-xl">
              <Icon name="phone" size={18} className="text-slate-600" />
            </a>
          )}
        </div>
      </div>
      {/* Spacer for sticky CTA on mobile */}
      <div className="md:hidden h-20" />
    </div>
  );
}
