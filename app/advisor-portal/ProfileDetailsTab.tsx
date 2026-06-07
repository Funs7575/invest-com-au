"use client";

import { useState, useEffect, useRef } from "react";
import Icon from "@/components/Icon";
import type { Advisor } from "./types";

type Service = {
  id: number;
  professional_id: number;
  name: string;
  description: string | null;
  price_type: "fixed" | "hourly" | "on_application" | "contact";
  price_from_cents: number | null;
  price_to_cents: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

type Certification = {
  id: number;
  professional_id: number;
  name: string;
  issuer: string;
  credential_id: string | null;
  issued_at: string | null;
  expires_at: string | null;
  cert_url: string | null;
  is_active: boolean;
  created_at: string;
};

const COMMON_SPECIALIZATIONS = [
  "SMSF",
  "Retirement Planning",
  "Tax Optimisation",
  "Investment Strategy",
  "Insurance",
  "Estate Planning",
  "Aged Care",
  "Business Succession",
];

const COMMON_LANGUAGES = [
  "English",
  "Mandarin",
  "Cantonese",
  "Vietnamese",
  "Arabic",
  "Hindi",
  "Greek",
  "Italian",
];

const MIN_ASSETS_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "No minimum" },
  { value: "100k", label: "$100k+" },
  { value: "250k", label: "$250k+" },
  { value: "500k", label: "$500k+" },
  { value: "1m", label: "$1m+" },
  { value: "2m", label: "$2m+" },
  { value: "5m", label: "$5m+" },
  { value: "10m+", label: "$10m+" },
];

const PRICE_TYPE_LABELS: Record<string, string> = {
  fixed: "Fixed price",
  hourly: "Hourly rate",
  on_application: "On application",
  contact: "Contact for pricing",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── Searchable combo-box for tag-style fields ─────────────────────────────────

function TagComboBox({
  label,
  placeholder,
  selected,
  options,
  onAdd,
  onRemove,
  maxLength = 100,
}: {
  label: string;
  placeholder: string;
  selected: string[];
  options: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  maxLength?: number;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(
    (o) =>
      !selected.includes(o) &&
      o.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Also show custom entry if typed value isn't in options and not already selected
  const showCustom =
    inputValue.trim().length > 0 &&
    !selected.includes(inputValue.trim()) &&
    !options.some((o) => o.toLowerCase() === inputValue.trim().toLowerCase());

  function commit(value: string) {
    const trimmed = value.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    onAdd(trimmed);
    setInputValue("");
    setIsOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const dropdownVisible = isOpen && (filtered.length > 0 || showCustom);

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <input
          aria-label={label}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length > 0 && inputValue.trim() === "") {
                // do nothing — no selection made
              } else {
                commit(inputValue);
              }
            } else if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 pr-8"
        />
        <Icon
          name="chevron-down"
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        {dropdownVisible && (
          <ul
            role="listbox"
            aria-label={`${label} options`}
            className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"
          >
            {filtered.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click
                    commit(option);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  {option}
                </button>
              </li>
            ))}
            {showCustom && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(inputValue);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-500 italic hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  Add &ldquo;{inputValue.trim()}&rdquo;
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs rounded-full"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="ml-0.5 hover:text-violet-900"
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfileDetailsTab({ advisor }: { advisor: Advisor | null }) {
  const [services, setServices] = useState<Service[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [languages, setLanguages] = useState<string[]>(advisor?.languages_spoken ?? []);
  const [minAssets, setMinAssets] = useState<string>(advisor?.min_client_assets_band ?? "any");
  const [specializations, setSpecializations] = useState<string[]>(advisor?.specializations ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ADV-100: flash IDs for newly added service / cert
  const [recentServiceId, setRecentServiceId] = useState<number | null>(null);
  const [recentCertId, setRecentCertId] = useState<number | null>(null);

  // Service form state
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [servicePriceType, setServicePriceType] = useState<"fixed" | "hourly" | "on_application" | "contact">("contact");
  const [servicePriceFrom, setServicePriceFrom] = useState("");
  const [servicePriceTo, setServicePriceTo] = useState("");
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  // Cert form state
  const [showCertForm, setShowCertForm] = useState(false);
  const [certName, setCertName] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certCredId, setCertCredId] = useState("");
  const [certIssuedAt, setCertIssuedAt] = useState("");
  const [certExpiresAt, setCertExpiresAt] = useState("");
  const [certUrl, setCertUrl] = useState("");
  const [certSubmitting, setCertSubmitting] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/advisor-auth/profile-details");
        if (res.ok) {
          const data = (await res.json()) as { services: Service[]; certifications: Certification[] };
          setServices(data.services);
          setCertifications(data.certifications);
        }
      } catch {
        // ignore — portal still usable without preloaded data
      }
    })();
  }, []);

  // ── Save profile details ─────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/advisor-auth/profile-details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languages_spoken: languages,
          min_client_assets_band: minAssets || null,
          specializations,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Failed to save.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSaving(false);
  }

  // ── Service CRUD ─────────────────────────────────────────────────────────

  async function handleAddService() {
    if (!serviceName.trim()) return;
    setServiceSubmitting(true);
    setError("");
    try {
      const priceFrom = servicePriceFrom ? Math.round(parseFloat(servicePriceFrom) * 100) : null;
      const priceTo = servicePriceTo ? Math.round(parseFloat(servicePriceTo) * 100) : null;
      const res = await fetch("/api/advisor-auth/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceName.trim(),
          description: serviceDesc.trim() || null,
          price_type: servicePriceType,
          price_from_cents: priceFrom,
          price_to_cents: priceTo,
        }),
      });
      if (res.ok) {
        const d = (await res.json()) as { service: Service };
        setServices((prev) => [...prev, d.service]);
        setShowServiceForm(false);
        setServiceName("");
        setServiceDesc("");
        setServicePriceType("contact");
        setServicePriceFrom("");
        setServicePriceTo("");
        // ADV-100: flash the newly added row
        setRecentServiceId(d.service.id);
        setTimeout(() => setRecentServiceId(null), 3000);
      } else {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Failed to add service.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setServiceSubmitting(false);
  }

  async function handleDeleteService(serviceId: number) {
    setError("");
    try {
      const res = await fetch(`/api/advisor-auth/services?serviceId=${serviceId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== serviceId));
      } else {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Failed to delete service.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  }

  // ── Certification CRUD ───────────────────────────────────────────────────

  async function handleAddCert() {
    if (!certName.trim() || !certIssuer.trim()) return;
    setCertSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/advisor-auth/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: certName.trim(),
          issuer: certIssuer.trim(),
          credential_id: certCredId.trim() || null,
          issued_at: certIssuedAt || null,
          expires_at: certExpiresAt || null,
          cert_url: certUrl.trim() || null,
        }),
      });
      if (res.ok) {
        const d = (await res.json()) as { certification: Certification };
        setCertifications((prev) => [d.certification, ...prev]);
        setShowCertForm(false);
        setCertName("");
        setCertIssuer("");
        setCertCredId("");
        setCertIssuedAt("");
        setCertExpiresAt("");
        setCertUrl("");
        // ADV-100: flash the newly added row
        setRecentCertId(d.certification.id);
        setTimeout(() => setRecentCertId(null), 3000);
      } else {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Failed to add certification.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setCertSubmitting(false);
  }

  async function handleDeleteCert(certId: number) {
    setError("");
    try {
      const res = await fetch(`/api/advisor-auth/certifications?certId=${certId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCertifications((prev) => prev.filter((c) => c.id !== certId));
      } else {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? "Failed to delete certification.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Profile Details</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Enrich your profile to help investors find the right advisor for their needs.
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── 1. Specializations ── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="star" size={16} className="text-violet-500" />
          <h3 className="text-sm font-bold text-slate-900">Specializations</h3>
        </div>
        <p className="text-xs text-slate-500">
          Add areas of expertise to help investors find you when searching by specialty.
        </p>
        {/* ADV-105: single searchable combo-box */}
        <TagComboBox
          label="Specializations"
          placeholder="Search or type a specialization…"
          selected={specializations}
          options={COMMON_SPECIALIZATIONS}
          onAdd={(v) => setSpecializations((prev) => [...prev, v])}
          onRemove={(v) => setSpecializations((prev) => prev.filter((t) => t !== v))}
          maxLength={100}
        />
      </section>

      {/* ── 2. Languages ── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="globe" size={16} className="text-violet-500" />
          <h3 className="text-sm font-bold text-slate-900">Languages Spoken</h3>
        </div>
        <p className="text-xs text-slate-500">
          Let clients know which languages you can advise in.
        </p>
        {/* ADV-105: single searchable combo-box */}
        <TagComboBox
          label="Languages"
          placeholder="Search or type a language…"
          selected={languages}
          options={COMMON_LANGUAGES}
          onAdd={(v) => setLanguages((prev) => [...prev, v])}
          onRemove={(v) => setLanguages((prev) => prev.filter((l) => l !== v))}
          maxLength={50}
        />
      </section>

      {/* ── 3. Minimum Client Assets ── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="dollar-sign" size={16} className="text-violet-500" />
          <h3 className="text-sm font-bold text-slate-900">Minimum Client Assets</h3>
        </div>
        <p className="text-xs text-slate-500">
          Set an investable-assets threshold so leads are pre-qualified before they contact you.
        </p>
        <select
          value={minAssets}
          onChange={(e) => setMinAssets(e.target.value)}
          className="w-full max-w-xs px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        >
          {MIN_ASSETS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </section>

      {/* ── Save button for sections 1–3 ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          aria-busy={saving}
          className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && (
          <span role="status" className="text-sm text-emerald-600 font-medium flex items-center gap-1">
            <Icon name="check-circle" size={14} className="text-emerald-500" />
            Saved
          </span>
        )}
      </div>

      {/* ── 4. Services Offered ── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="briefcase" size={16} className="text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900">Services Offered</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowServiceForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Icon name="plus" size={14} />
            Add Service
          </button>
        </div>

        {showServiceForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-700">New Service</h4>
            <div>
              <label htmlFor="svc-name" className="block text-xs font-medium text-slate-600 mb-1">
                Service name <span className="text-red-400">*</span>
              </label>
              <input
                id="svc-name"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Retirement Planning Review"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="svc-desc" className="block text-xs font-medium text-slate-600 mb-1">
                Description <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                id="svc-desc"
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                placeholder="Brief description of what this service includes..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="svc-price-type" className="block text-xs font-medium text-slate-600 mb-1">Pricing type</label>
                <select
                  id="svc-price-type"
                  value={servicePriceType}
                  onChange={(e) =>
                    setServicePriceType(e.target.value as typeof servicePriceType)
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="contact">Contact for pricing</option>
                  <option value="fixed">Fixed price</option>
                  <option value="hourly">Hourly rate</option>
                  <option value="on_application">On application</option>
                </select>
              </div>
              {(servicePriceType === "fixed" || servicePriceType === "hourly") && (
                <div>
                  <label htmlFor="svc-price-from" className="block text-xs font-medium text-slate-600 mb-1">
                    Price from ($)
                  </label>
                  <input
                    id="svc-price-from"
                    type="number"
                    min="0"
                    step="1"
                    value={servicePriceFrom}
                    onChange={(e) => setServicePriceFrom(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
              )}
            </div>
            {(servicePriceType === "fixed" || servicePriceType === "hourly") &&
              servicePriceFrom && (
                <div>
                  <label htmlFor="svc-price-to" className="block text-xs font-medium text-slate-600 mb-1">
                    Price to ($) <span className="text-slate-400">(optional upper bound)</span>
                  </label>
                  <input
                    id="svc-price-to"
                    type="number"
                    min="0"
                    step="1"
                    value={servicePriceTo}
                    onChange={(e) => setServicePriceTo(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
              )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddService}
                disabled={serviceSubmitting || !serviceName.trim()}
                className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {serviceSubmitting ? "Adding..." : "Add Service"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowServiceForm(false);
                  setServiceName("");
                  setServiceDesc("");
                  setServicePriceType("contact");
                  setServicePriceFrom("");
                  setServicePriceTo("");
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {services.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {services.map((service) => (
              <div
                key={service.id}
                className={`py-3 flex items-start justify-between gap-3 rounded-lg transition-colors duration-500 ${
                  recentServiceId === service.id ? "bg-emerald-50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                    {/* ADV-100: inline "Added" confirmation */}
                    {recentServiceId === service.id && (
                      <span
                        role="status"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full"
                      >
                        <Icon name="check" size={11} className="text-emerald-600" />
                        Added
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{service.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                      {PRICE_TYPE_LABELS[service.price_type] ?? service.price_type}
                    </span>
                    {service.price_from_cents !== null && (
                      <span className="text-xs font-medium text-slate-600">
                        {formatCents(service.price_from_cents)}
                        {service.price_to_cents !== null &&
                          ` – ${formatCents(service.price_to_cents)}`}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { void handleDeleteService(service.id); }}
                  className="shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label={`Delete service ${service.name}`}
                >
                  <Icon name="trash-2" size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">
            No services added yet. Click &quot;Add Service&quot; to get started.
          </p>
        )}
      </section>

      {/* ── 5. Qualifications & Certifications ── */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="award" size={16} className="text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900">Qualifications & Certifications</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowCertForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Icon name="plus" size={14} />
            Add Qualification
          </button>
        </div>

        {showCertForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-700">New Qualification</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="cert-name" className="block text-xs font-medium text-slate-600 mb-1">
                  Qualification name <span className="text-red-400">*</span>
                </label>
                <input
                  id="cert-name"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  placeholder="e.g. CFP® Certification"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  maxLength={150}
                />
              </div>
              <div>
                <label htmlFor="cert-issuer" className="block text-xs font-medium text-slate-600 mb-1">
                  Issuing body <span className="text-red-400">*</span>
                </label>
                <input
                  id="cert-issuer"
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  placeholder="e.g. Financial Planning Association"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  maxLength={150}
                />
              </div>
              <div>
                <label htmlFor="cert-cred-id" className="block text-xs font-medium text-slate-600 mb-1">
                  Credential / Licence ID <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="cert-cred-id"
                  value={certCredId}
                  onChange={(e) => setCertCredId(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  maxLength={100}
                />
              </div>
              <div>
                <label htmlFor="cert-issued-at" className="block text-xs font-medium text-slate-600 mb-1">
                  Date issued <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="cert-issued-at"
                  type="date"
                  value={certIssuedAt}
                  onChange={(e) => setCertIssuedAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
              <div>
                <label htmlFor="cert-expires-at" className="block text-xs font-medium text-slate-600 mb-1">
                  Expiry date <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="cert-expires-at"
                  type="date"
                  value={certExpiresAt}
                  onChange={(e) => setCertExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
              <div>
                <label htmlFor="cert-url" className="block text-xs font-medium text-slate-600 mb-1">
                  Certificate URL <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="cert-url"
                  type="url"
                  value={certUrl}
                  onChange={(e) => setCertUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddCert}
                disabled={certSubmitting || !certName.trim() || !certIssuer.trim()}
                className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {certSubmitting ? "Adding..." : "Add Qualification"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCertForm(false);
                  setCertName("");
                  setCertIssuer("");
                  setCertCredId("");
                  setCertIssuedAt("");
                  setCertExpiresAt("");
                  setCertUrl("");
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {certifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {certifications.map((cert) => (
              <div
                key={cert.id}
                className={`py-3 flex items-start justify-between gap-3 rounded-lg transition-colors duration-500 ${
                  recentCertId === cert.id ? "bg-emerald-50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{cert.name}</p>
                    {/* ADV-100: inline "Added" confirmation */}
                    {recentCertId === cert.id && (
                      <span
                        role="status"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-full"
                      >
                        <Icon name="check" size={11} className="text-emerald-600" />
                        Added
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{cert.issuer}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {cert.credential_id && (
                      <span className="text-xs text-slate-400">ID: {cert.credential_id}</span>
                    )}
                    {cert.issued_at && (
                      <span className="text-xs text-slate-400">
                        Issued{" "}
                        {new Date(cert.issued_at).toLocaleDateString("en-AU", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {cert.expires_at && (
                      <span className="text-xs text-slate-400">
                        Expires{" "}
                        {new Date(cert.expires_at).toLocaleDateString("en-AU", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {cert.cert_url && (
                      <a
                        href={cert.cert_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet-600 hover:underline"
                      >
                        View certificate ↗
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { void handleDeleteCert(cert.id); }}
                  className="shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label={`Delete qualification ${cert.name}`}
                >
                  <Icon name="trash-2" size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">
            No qualifications added yet. Click &quot;Add Qualification&quot; to get started.
          </p>
        )}
      </section>
    </div>
  );
}
