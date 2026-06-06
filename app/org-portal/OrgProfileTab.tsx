"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { Organisation } from "./types";

type Props = {
  org: Organisation | null;
  onOrgChange: (o: Organisation) => void;
};

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

/**
 * Inner form — receives a non-null org and is remounted via `key={org.id}`
 * whenever the org changes, so useState initialises fresh from props each time.
 */
function OrgProfileForm({ org, onOrgChange }: { org: Organisation; onOrgChange: (o: Organisation) => void }) {
  const [name, setName] = useState(org.name ?? "");
  const [bio, setBio] = useState(org.bio ?? "");
  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? "");
  const [website, setWebsite] = useState(org.website ?? "");
  const [email, setEmail] = useState(org.email ?? "");
  const [phone, setPhone] = useState(org.phone ?? "");
  const [locationState, setLocationState] = useState(org.location_state ?? "");
  const [cpdProviderNumber, setCpdProviderNumber] = useState(org.cpd_provider_number ?? "");
  const [abn, setAbn] = useState(org.abn ?? "");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/org-auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          logo_url: logoUrl.trim(),
          website: website.trim(),
          email: email.trim(),
          phone: phone.trim(),
          location_state: locationState,
          cpd_provider_number: cpdProviderNumber.trim(),
          abn: abn.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onOrgChange(data.org);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        setSaveError(d.error ?? "Failed to save profile.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Organisation Profile</h1>
          <p className="text-sm text-slate-500">Changes are saved to your public listing.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {/* Logo preview */}
        {logoUrl && (
          <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Organisation logo"
              className="w-16 h-16 rounded-lg object-contain border border-slate-200 bg-white"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <p className="text-xs text-slate-500">Logo preview</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Organisation Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Your organisation name"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            placeholder="Describe your organisation and the courses you offer..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Logo URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="https://example.com/logo.png"
          />
          <p className="text-[0.55rem] text-slate-400 mt-1">Paste a direct image URL. Square PNG or SVG recommended.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="02 XXXX XXXX"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="contact@organisation.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
            <select
              value={locationState}
              onChange={(e) => setLocationState(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">Select state</option>
              {AU_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">ABN</label>
          <input
            type="text"
            value={abn}
            onChange={(e) => setAbn(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="12 345 678 901"
          />
        </div>

        {/* CPD Provider Number — only shown for CPD providers */}
        {org.organisation_type === "cpd_provider" && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">CPD Provider Number</label>
            <input
              type="text"
              value={cpdProviderNumber}
              onChange={(e) => setCpdProviderNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. CPD-12345"
            />
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            {saveError}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span role="status" className="text-sm text-emerald-600 font-medium flex items-center gap-1">
              <Icon name="check-circle" size={16} />
              Saved!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrgProfileTab({ org, onOrgChange }: Props) {
  if (!org) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Organisation Profile</h1>
        <p className="text-sm text-slate-500">Loading profile...</p>
      </div>
    );
  }
  return <OrgProfileForm key={org.id} org={org} onOrgChange={onOrgChange} />;
}
