"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import AdvisorPhotoUpload from "@/components/AdvisorPhotoUpload";
import type { Advisor, Review } from "./types";

type Props = {
  advisor: Advisor;
  reviews: Review[];
  onAdvisorChange: (a: Advisor) => void;
};

export default function ProfileTab({ advisor, reviews, onAdvisorChange }: Props) {
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await fetch("/api/advisor-auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: advisor.bio,
          specialties: advisor.specialties,
          fee_structure: advisor.fee_structure,
          fee_description: advisor.fee_description,
          website: advisor.website,
          phone: advisor.phone,
          booking_link: advisor.booking_link,
          booking_intro: advisor.booking_intro,
          offer_text: advisor.offer_text || null,
          offer_terms: advisor.offer_terms || null,
          offer_active: advisor.offer_active || false,
        }),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch { /* ignore */ }
    setSavingProfile(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Edit Profile</h1>
          <p className="text-sm text-slate-500">Changes are saved to your public listing.</p>
        </div>
        <Link href={`/advisor/${advisor.slug}`} target="_blank" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <Icon name="external-link" size={14} />
          Preview
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {/* Profile Photo */}
        <div className="flex flex-col items-center pb-2 border-b border-slate-100">
          <AdvisorPhotoUpload
            currentPhotoUrl={advisor.photo_url}
            advisorSlug={advisor.slug}
            onPhotoUpdated={(url) => onAdvisorChange({ ...advisor, photo_url: url })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Bio</label>
          <textarea
            value={advisor.bio || ""}
            onChange={(e) => onAdvisorChange({ ...advisor, bio: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Tell investors about your experience and approach..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Fee Structure</label>
          <select
            value={advisor.fee_structure || "fee-for-service"}
            onChange={(e) => onAdvisorChange({ ...advisor, fee_structure: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="fee-for-service">Fee for Service</option>
            <option value="commission">Commission Based</option>
            <option value="hybrid">Hybrid</option>
            <option value="percentage">Percentage of AUM</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Fee Description (shown to investors)</label>
          <input
            value={advisor.fee_description || ""}
            onChange={(e) => onAdvisorChange({ ...advisor, fee_description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="e.g. SOA from $3,300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
            <input
              value={advisor.website || ""}
              onChange={(e) => onAdvisorChange({ ...advisor, website: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
            <input
              value={advisor.phone || ""}
              onChange={(e) => onAdvisorChange({ ...advisor, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="04XX XXX XXX"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Booking Link (Calendly / Cal.com)</label>
          <input
            value={advisor.booking_link || ""}
            onChange={(e) => onAdvisorChange({ ...advisor, booking_link: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="https://calendly.com/your-name/30min"
          />
          <p className="text-[0.55rem] text-slate-400 mt-1">Paste your Calendly or Cal.com link. A &quot;Book Free Call&quot; button will appear on your profile.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Booking Intro (optional)</label>
          <input
            value={advisor.booking_intro || ""}
            onChange={(e) => onAdvisorChange({ ...advisor, booking_intro: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="e.g. Book a free 30-minute consultation"
          />
        </div>

        {/* Special Offer / Deal */}
        <div className="border-t border-slate-100 pt-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-bold text-slate-900">Special Offer</label>
              <p className="text-[0.62rem] text-slate-500">Create a promotional offer shown on your profile and the Deals page.</p>
            </div>
            <button
              type="button"
              onClick={() => onAdvisorChange({ ...advisor, offer_active: !advisor.offer_active })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${advisor.offer_active ? "bg-violet-600" : "bg-slate-200"}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition-transform ${advisor.offer_active ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          {advisor.offer_active && (
            <div className="space-y-3 bg-violet-50 border border-violet-200/60 rounded-lg p-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Offer Headline</label>
                <input
                  value={advisor.offer_text || ""}
                  onChange={(e) => onAdvisorChange({ ...advisor, offer_text: e.target.value })}
                  className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  placeholder="e.g. Free 30-minute initial consultation"
                  maxLength={100}
                />
                <p className="text-[0.55rem] text-slate-400 mt-1">Keep it short and compelling. This is the main text investors see.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Terms & Conditions (optional)</label>
                <input
                  value={advisor.offer_terms || ""}
                  onChange={(e) => onAdvisorChange({ ...advisor, offer_terms: e.target.value })}
                  className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  placeholder="e.g. New clients only. Valid until March 2026."
                  maxLength={200}
                />
              </div>
              {advisor.offer_text && (
                <div className="bg-white border border-violet-100 rounded-lg p-3">
                  <p className="text-[0.58rem] font-bold uppercase tracking-wider text-violet-500 mb-1">Preview</p>
                  <p className="text-sm font-bold text-violet-700">{advisor.offer_text}</p>
                  {advisor.offer_terms && <p className="text-[0.62rem] text-violet-500 mt-0.5">{advisor.offer_terms}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
          {profileSaved && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
        </div>
      </div>

      {/* Reviews section */}
      {reviews.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Your Reviews ({reviews.length})</h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-900">{r.reviewer_name}</span>
                  <span className="text-amber-400 text-xs">{"★".repeat(r.rating)}</span>
                </div>
                {r.title && <div className="text-sm font-medium text-slate-800 mb-1">{r.title}</div>}
                {r.body && <p className="text-xs text-slate-600 leading-relaxed">{r.body}</p>}
                <div className="text-[0.56rem] text-slate-400 mt-2">{new Date(r.created_at).toLocaleDateString("en-AU")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
