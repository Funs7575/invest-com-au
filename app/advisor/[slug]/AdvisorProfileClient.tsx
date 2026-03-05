"use client";

import { useState } from "react";
import Link from "next/link";
import type { Professional, ProfessionalReview } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import Icon from "@/components/Icon";

function renderStars(rating: number) {
  return "★".repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? "½" : "");
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-xl transition-colors ${star <= value ? "text-amber-400" : "text-slate-200 hover:text-amber-200"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function AdvisorProfileClient({ professional: pro, similar, reviews = [] }: { professional: Professional; similar: Professional[]; reviews?: ProfessionalReview[] }) {
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  // Review form state
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewState, setReviewState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");

  const typeLabel = PROFESSIONAL_TYPE_LABELS[pro.type] || "Financial Professional";

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
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
        }),
      });
      if (res.ok) {
        setFormState("success");
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
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex gap-4">
            {/* Avatar */}
            {pro.photo_url ? (
              <img src={pro.photo_url} alt={pro.name} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 flex items-center justify-center text-lg md:text-xl font-bold text-slate-500 shrink-0">
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

        {/* Quick facts grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
          {[
            { label: "Type", value: typeLabel, icon: "briefcase" },
            { label: "Location", value: pro.location_display || "Australia", icon: "map-pin" },
            { label: "Fees", value: pro.fee_description || "Contact for pricing", icon: "coins" },
            { label: "Licence", value: pro.afsl_number || pro.registration_number || "Verified", icon: "shield-check" },
          ].map((f) => (
            <div key={f.label} className="bg-white border border-slate-200 rounded-lg p-2.5 md:p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon name={f.icon} size={12} className="text-slate-400" />
                <span className="text-[0.56rem] md:text-[0.62rem] text-slate-400 uppercase font-semibold tracking-wide">{f.label}</span>
              </div>
              <div className="text-xs md:text-sm font-semibold text-slate-800 truncate">{f.value}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        {pro.bio && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 mb-4 md:mb-6">
            <h2 className="text-sm md:text-base font-bold text-slate-900 mb-2">About {pro.name}</h2>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-line">{pro.bio}</p>
          </div>
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
                    placeholder="Full name"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="04XX XXX XXX"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">What do you need help with? <span className="text-slate-400 font-normal">(optional)</span></label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Brief description of your situation..."
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-vertical"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!name.trim() || !email.trim() || formState === "submitting"}
                  className="w-full py-3 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {formState === "submitting" ? "Sending..." : `Send Enquiry to ${pro.name.split(" ")[0]}`}
                </button>

                {formState === "error" && (
                  <p className="text-xs text-red-600 text-center">Something went wrong. Please try again or email directly.</p>
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

          {/* Existing reviews */}
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
                  </div>
                  {r.title && <div className="text-xs font-semibold text-slate-800 mb-0.5">{r.title}</div>}
                  <p className="text-xs text-slate-600 leading-relaxed">{r.body}</p>
                </div>
              ))}
            </div>
          ) : !reviewFormOpen && reviewState !== "success" ? (
            <p className="text-xs text-slate-400 mb-3">No reviews yet. Be the first to share your experience.</p>
          ) : null}

          {/* Review submission form */}
          {reviewState === "success" ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-emerald-800">Thanks! Your review has been submitted for moderation.</p>
              <p className="text-[0.62rem] text-emerald-600 mt-1">It will appear once verified (usually within 48 hours).</p>
            </div>
          ) : reviewFormOpen && (
            <div className="border-t border-slate-100 pt-3">
              <h3 className="text-xs font-bold text-slate-700 mb-3">Share Your Experience with {pro.name.split(" ")[0]}</h3>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[0.62rem] font-semibold text-slate-600 mb-0.5">Rating *</label>
                  <StarRating value={reviewRating} onChange={setReviewRating} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[0.62rem] font-semibold text-slate-600 mb-0.5">Your name *</label>
                    <input value={reviewName} onChange={(e) => setReviewName(e.target.value)} className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-[0.62rem] font-semibold text-slate-600 mb-0.5">Email * <span className="text-slate-400 font-normal">(not shown)</span></label>
                    <input type="email" value={reviewEmail} onChange={(e) => setReviewEmail(e.target.value)} className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="your@email.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.62rem] font-semibold text-slate-600 mb-0.5">Title <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Summary of your experience" />
                </div>
                <div>
                  <label className="block text-[0.62rem] font-semibold text-slate-600 mb-0.5">Your review *</label>
                  <textarea value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} rows={3} className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-vertical" placeholder="What was your experience working with this advisor?" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!reviewRating || !reviewName.trim() || !reviewEmail.trim() || !reviewBody.trim()) return;
                      setReviewState("submitting");
                      try {
                        const res = await fetch("/api/advisor-review", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            professional_id: pro.id,
                            reviewer_name: reviewName.trim(),
                            reviewer_email: reviewEmail.trim(),
                            rating: reviewRating,
                            title: reviewTitle.trim() || undefined,
                            body: reviewBody.trim(),
                          }),
                        });
                        setReviewState(res.ok ? "success" : "error");
                      } catch { setReviewState("error"); }
                    }}
                    disabled={!reviewRating || !reviewName.trim() || !reviewEmail.trim() || !reviewBody.trim() || reviewState === "submitting"}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all"
                  >
                    {reviewState === "submitting" ? "Submitting..." : "Submit Review"}
                  </button>
                  <button onClick={() => setReviewFormOpen(false)} className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
                {reviewState === "error" && <p className="text-xs text-red-600">Failed to submit. You may have already reviewed this advisor.</p>}
                <p className="text-[0.56rem] text-slate-400">Reviews are moderated before publication. Your email is used for verification only and will not be displayed.</p>
              </div>
            </div>
          )}
        </div>

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

        {/* Compliance */}
        <div className="text-[0.56rem] md:text-xs text-slate-400 text-center leading-relaxed">
          <p>Invest.com.au does not provide financial advice. We facilitate connections between users and registered financial professionals. 
          Verify any advisor&apos;s credentials on the <a href="https://asic.gov.au/online-services/search-asics-registers/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">ASIC Register</a> before engaging their services.</p>
        </div>
      </div>
    </div>
  );
}
