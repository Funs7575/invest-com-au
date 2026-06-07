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

const AVAILABILITY_OPTIONS: { value: 'open' | 'waitlist' | 'closed'; label: string; description: string; dot: string }[] = [
  { value: 'open', label: 'Accepting New Clients', description: 'Shown as a green badge on your profile', dot: 'bg-emerald-500' },
  { value: 'waitlist', label: 'Waitlist', description: 'Clients can join a queue — shown as a yellow badge', dot: 'bg-amber-400' },
  { value: 'closed', label: 'Not Taking New Clients', description: 'Shown as a grey badge; you still appear in search', dot: 'bg-slate-400' },
];

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
          available_in_countries: advisor.available_in_countries || [],
          availability_status: advisor.availability_status || 'open',
        }),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch { /* ignore */ }
    setSavingProfile(false);
  };

  const currentStatus = advisor.availability_status ?? 'open';

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Edit Profile</h1>
          <p className="text-sm text-slate-500">Changes are saved to your public listing.</p>
        </div>
        <Link href={`/advisor/${advisor.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
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

        {/* Availability Status */}
        <div>
          <p className="block text-xs font-semibold text-slate-600 mb-1">Availability Status</p>
          <p className="text-[0.62rem] text-slate-400 mb-2">
            Shown as a badge on your profile and in the advisor directory.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {AVAILABILITY_OPTIONS.map((opt) => {
              const isSelected = currentStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onAdvisorChange({ ...advisor, availability_status: opt.value })}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    isSelected
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${opt.dot}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[0.6rem] text-slate-400 mt-0.5 leading-tight">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="pt-bio" className="block text-xs font-semibold text-slate-600 mb-1">Bio</label>
          <textarea
            id="pt-bio"
            value={advisor.bio || ""}
            onChange={(e) => onAdvisorChange({ ...advisor, bio: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Tell investors about your experience and approach..."
          />
        </div>

        <div>
          <label htmlFor="pt-fee-structure" className="block text-xs font-semibold text-slate-600 mb-1">Fee Structure</label>
          <select
            id="pt-fee-structure"
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
          <label htmlFor="pt-fee-description" className="block text-xs font-semibold text-slate-600 mb-1">Fee Description (shown to investors)</label>
          <input
            id="pt-fee-description"
            value={advisor.fee_description || ""}
            onChange={(e) => onAdvisorChange({ ...advisor, fee_description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="e.g. SOA from $3,300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pt-website" className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
            <input
              id="pt-website"
              type="url"
              value={advisor.website || ""}
              onChange={(e) => onAdvisorChange({ ...advisor, website: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="https://..."
              autoComplete="url"
            />
          </div>
          <div>
            <label htmlFor="pt-phone" className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
            <input
              id="pt-phone"
              value={advisor.phone || ""}
              onChange={(e) => onAdvisorChange({ ...advisor, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder="04XX XXX XXX"
            />
          </div>
        </div>

        <CountriesServedField
          value={advisor.available_in_countries || []}
          onChange={(next) => onAdvisorChange({ ...advisor, available_in_countries: next })}
        />

        <div>
          <label htmlFor="pt-booking-link" className="block text-xs font-semibold text-slate-600 mb-1">Booking Link (Calendly / Cal.com)</label>
          <input
            id="pt-booking-link"
            type="url"
            value={advisor.booking_link || ""}
            onChange={(e) => onAdvisorChange({ ...advisor, booking_link: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="https://calendly.com/your-name/30min"
            autoComplete="url"
          />
          <p className="text-[0.55rem] text-slate-400 mt-1">Paste your Calendly or Cal.com link. A &quot;Book Free Call&quot; button will appear on your profile.</p>
        </div>

        <div>
          <label htmlFor="pt-booking-intro" className="block text-xs font-semibold text-slate-600 mb-1">Booking Intro (optional)</label>
          <input
            id="pt-booking-intro"
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
              <p className="block text-sm font-bold text-slate-900">Special Offer</p>
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
                <label htmlFor="pt-offer-headline" className="block text-xs font-semibold text-slate-600 mb-1">Offer Headline</label>
                <input
                  id="pt-offer-headline"
                  value={advisor.offer_text || ""}
                  onChange={(e) => onAdvisorChange({ ...advisor, offer_text: e.target.value })}
                  className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  placeholder="e.g. Free 30-minute initial consultation"
                  maxLength={100}
                />
                <p className="text-[0.55rem] text-slate-400 mt-1">Keep it short and compelling. This is the main text investors see.</p>
              </div>
              <div>
                <label htmlFor="pt-offer-terms" className="block text-xs font-semibold text-slate-600 mb-1">Terms & Conditions (optional)</label>
                <input
                  id="pt-offer-terms"
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
            aria-busy={savingProfile}
            className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingProfile ? "Saving..." : "Save Changes"}
          </button>
          {profileSaved && <span role="status" className="text-sm text-emerald-600 font-medium">Saved!</span>}
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

// Countries an advisor can serve — FIN_NOTEBOOK cross-border Phase B.
// Curated to the 12 corridors that have lib/foreign-investment-country-data
// configs today; AU is always included because every advisor is AU-licensed
// by definition (the toggle is implicit, not exposed).
const CORRIDOR_COUNTRIES: ReadonlyArray<{ code: string; label: string }> = [
  { code: "gb", label: "United Kingdom" },
  { code: "us", label: "United States" },
  { code: "cn", label: "China" },
  { code: "in", label: "India" },
  { code: "hk", label: "Hong Kong" },
  { code: "sg", label: "Singapore" },
  { code: "nz", label: "New Zealand" },
  { code: "jp", label: "Japan" },
  { code: "kr", label: "South Korea" },
  { code: "my", label: "Malaysia" },
  { code: "ae", label: "United Arab Emirates" },
  { code: "sa", label: "Saudi Arabia" },
];

interface CountriesServedFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
}

function CountriesServedField({ value, onChange }: CountriesServedFieldProps) {
  const selected = new Set(value);
  return (
    <div>
      <p className="block text-xs font-semibold text-slate-600 mb-1">
        Cross-border corridors you serve
      </p>
      <p className="text-[0.62rem] text-slate-400 mb-2">
        Tick the countries you actively help clients with. Investors landing on
        country pages get matched to you first when their country is one you
        flagged. AU is implicit — every advisor here is AU-licensed.
      </p>
      <div className="flex flex-wrap gap-2">
        {CORRIDOR_COUNTRIES.map((c) => {
          const active = selected.has(c.code);
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                const next = new Set(selected);
                if (active) next.delete(c.code);
                else next.add(c.code);
                onChange(Array.from(next).sort());
              }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
              }`}
              aria-pressed={active}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
