"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\-()\d\s]{8,}$/;
const URL_RE = /^https?:\/\/.+\..+/;

const ORG_TYPE_LABELS: Record<string, string> = {
  training_provider: "Training Provider",
  cpd_provider: "CPD Provider",
  compliance: "Compliance Training",
  fintech: "Fintech / Software",
  industry_body: "Industry Body",
  law_firm: "Law Firm",
  accounting_firm: "Accounting Firm",
  other: "Other",
};

function FieldCheck() {
  return (
    <svg
      className="w-4 h-4 text-emerald-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

type FormState = {
  organisation_name: string;
  organisation_type: string;
  abn: string;
  website: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  bio: string;
  cpd_provider_number: string;
};

type TouchedState = {
  organisation_name: boolean;
  website: boolean;
  contact_name: boolean;
  contact_email: boolean;
  contact_phone: boolean;
};

type FieldErrors = {
  organisation_name: string;
  website: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
};

export default function ProviderApplyClient() {
  const [form, setForm] = useState<FormState>({
    organisation_name: "",
    organisation_type: "training_provider",
    abn: "",
    website: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    bio: "",
    cpd_provider_number: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [touched, setTouched] = useState<TouchedState>({
    organisation_name: false,
    website: false,
    contact_name: false,
    contact_email: false,
    contact_phone: false,
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    organisation_name: "",
    website: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
  });

  const validateOrgName = useCallback((v: string) => {
    if (!v.trim()) return "Organisation name is required";
    if (v.trim().length < 2) return "Must be at least 2 characters";
    return "";
  }, []);

  const validateWebsite = useCallback((v: string) => {
    if (!v.trim()) return "Website is required";
    if (!URL_RE.test(v.trim())) return "Must be a valid URL (e.g. https://...)";
    return "";
  }, []);

  const validateContactName = useCallback((v: string) => {
    if (!v.trim()) return "Contact name is required";
    if (v.trim().length < 2) return "Must be at least 2 characters";
    return "";
  }, []);

  const validateEmail = useCallback((v: string) => {
    if (!v.trim()) return "Email is required";
    if (!EMAIL_RE.test(v.trim())) return "Please enter a valid email";
    return "";
  }, []);

  const validatePhone = useCallback((v: string) => {
    if (!v.trim()) return "";
    if (!PHONE_RE.test(v.trim())) return "Please enter a valid phone number";
    return "";
  }, []);

  const isFormValid =
    !validateOrgName(form.organisation_name) &&
    !validateWebsite(form.website) &&
    !validateContactName(form.contact_name) &&
    !validateEmail(form.contact_email) &&
    !validatePhone(form.contact_phone) &&
    !!form.organisation_type;

  const submit = async () => {
    // Touch all fields to show errors
    setTouched({
      organisation_name: true,
      website: true,
      contact_name: true,
      contact_email: true,
      contact_phone: true,
    });
    setFieldErrors({
      organisation_name: validateOrgName(form.organisation_name),
      website: validateWebsite(form.website),
      contact_name: validateContactName(form.contact_name),
      contact_email: validateEmail(form.contact_email),
      contact_phone: validatePhone(form.contact_phone),
    });

    if (!isFormValid) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const payload = {
        organisation_name: form.organisation_name.trim(),
        organisation_type: form.organisation_type,
        abn: form.abn.trim() || undefined,
        website: form.website.trim(),
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim(),
        contact_phone: form.contact_phone.trim() || undefined,
        bio: form.bio.trim() || undefined,
        cpd_provider_number: form.cpd_provider_number.trim() || undefined,
      };

      const res = await fetch("/api/org-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json().catch(() => ({ error: "Something went wrong." }));
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="py-12 md:py-20">
        <div className="container-custom max-w-lg text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="check" size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
            Application Submitted!
          </h1>
          <p className="text-slate-500 mb-6">
            Thanks for applying. We&apos;ll review your details and get back to
            you within 5 business days. Check your email for confirmation.
          </p>
          <Link
            href="/for-providers"
            className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
          >
            &larr; Back to For Providers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-2xl">
        <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/for-providers" className="hover:text-slate-900">
            For Providers
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Apply</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-5 md:p-8 mb-6 md:mb-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative">
            <h1 className="text-xl md:text-3xl font-extrabold mb-2">
              Register Your Organisation
            </h1>
            <p className="text-sm md:text-base text-teal-200 mb-4 leading-relaxed max-w-lg">
              List your courses on Invest.com.au and reach Australia&apos;s
              financial professionals. We review all applications within 5
              business days.
            </p>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { icon: "gift", title: "Free to Apply", desc: "No upfront cost" },
                { icon: "users", title: "30,000+ Advisors", desc: "Direct audience" },
                { icon: "award", title: "CPD Certificates", desc: "Auto-issued" },
              ].map((v, i) => (
                <div
                  key={i}
                  className="bg-white/10 backdrop-blur rounded-lg p-2.5 md:p-3 text-center"
                >
                  <Icon
                    name={v.icon}
                    size={18}
                    className="text-teal-200 mx-auto mb-1"
                  />
                  <div className="text-[0.62rem] md:text-xs font-bold text-white">
                    {v.title}
                  </div>
                  <div className="text-[0.5rem] md:text-[0.62rem] text-teal-300">
                    {v.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
          <div className="space-y-4">
            {/* Organisation Name */}
            <div>
              <label
                htmlFor="pa-org-name"
                className="block text-xs font-semibold text-slate-600 mb-1"
              >
                Organisation Name *
              </label>
              <div className="relative">
                <input
                  id="pa-org-name"
                  value={form.organisation_name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({ ...form, organisation_name: v });
                    if (touched.organisation_name)
                      setFieldErrors((prev) => ({
                        ...prev,
                        organisation_name: validateOrgName(v),
                      }));
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, organisation_name: true }));
                    setFieldErrors((prev) => ({
                      ...prev,
                      organisation_name: validateOrgName(form.organisation_name),
                    }));
                  }}
                  aria-invalid={
                    !!fieldErrors.organisation_name && touched.organisation_name
                  }
                  className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm ${
                    fieldErrors.organisation_name && touched.organisation_name
                      ? "border-red-500"
                      : "border-slate-200"
                  }`}
                  placeholder="ASIC CPD Academy Pty Ltd"
                />
                {touched.organisation_name &&
                  !fieldErrors.organisation_name &&
                  form.organisation_name && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">
                      <FieldCheck />
                    </span>
                  )}
              </div>
              {fieldErrors.organisation_name && touched.organisation_name && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.organisation_name}
                </p>
              )}
            </div>

            {/* Organisation Type */}
            <div>
              <label
                htmlFor="pa-org-type"
                className="block text-xs font-semibold text-slate-600 mb-1"
              >
                Organisation Type *
              </label>
              <select
                id="pa-org-type"
                value={form.organisation_type}
                onChange={(e) =>
                  setForm({ ...form, organisation_type: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {Object.entries(ORG_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* ABN + Website */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pa-abn"
                  className="block text-xs font-semibold text-slate-600 mb-1"
                >
                  ABN
                </label>
                <input
                  id="pa-abn"
                  value={form.abn}
                  onChange={(e) => setForm({ ...form, abn: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="XX XXX XXX XXX"
                />
              </div>
              <div>
                <label
                  htmlFor="pa-website"
                  className="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Website *
                </label>
                <div className="relative">
                  <input
                    id="pa-website"
                    value={form.website}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, website: v });
                      if (touched.website)
                        setFieldErrors((prev) => ({
                          ...prev,
                          website: validateWebsite(v),
                        }));
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, website: true }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        website: validateWebsite(form.website),
                      }));
                    }}
                    aria-invalid={!!fieldErrors.website && touched.website}
                    className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm ${
                      fieldErrors.website && touched.website
                        ? "border-red-500"
                        : "border-slate-200"
                    }`}
                    placeholder="https://..."
                  />
                  {touched.website &&
                    !fieldErrors.website &&
                    form.website && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2">
                        <FieldCheck />
                      </span>
                    )}
                </div>
                {fieldErrors.website && touched.website && (
                  <p className="text-xs text-red-500 mt-1">
                    {fieldErrors.website}
                  </p>
                )}
              </div>
            </div>

            {/* Contact Name + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pa-contact-name"
                  className="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Contact Name *
                </label>
                <div className="relative">
                  <input
                    id="pa-contact-name"
                    value={form.contact_name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, contact_name: v });
                      if (touched.contact_name)
                        setFieldErrors((prev) => ({
                          ...prev,
                          contact_name: validateContactName(v),
                        }));
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, contact_name: true }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        contact_name: validateContactName(form.contact_name),
                      }));
                    }}
                    aria-invalid={
                      !!fieldErrors.contact_name && touched.contact_name
                    }
                    className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm ${
                      fieldErrors.contact_name && touched.contact_name
                        ? "border-red-500"
                        : "border-slate-200"
                    }`}
                    placeholder="Jane Smith"
                  />
                  {touched.contact_name &&
                    !fieldErrors.contact_name &&
                    form.contact_name && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2">
                        <FieldCheck />
                      </span>
                    )}
                </div>
                {fieldErrors.contact_name && touched.contact_name && (
                  <p className="text-xs text-red-500 mt-1">
                    {fieldErrors.contact_name}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="pa-contact-email"
                  className="block text-xs font-semibold text-slate-600 mb-1"
                >
                  Contact Email *
                </label>
                <div className="relative">
                  <input
                    id="pa-contact-email"
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, contact_email: v });
                      if (touched.contact_email)
                        setFieldErrors((prev) => ({
                          ...prev,
                          contact_email: validateEmail(v),
                        }));
                    }}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, contact_email: true }));
                      setFieldErrors((prev) => ({
                        ...prev,
                        contact_email: validateEmail(form.contact_email),
                      }));
                    }}
                    aria-invalid={
                      !!fieldErrors.contact_email && touched.contact_email
                    }
                    className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm ${
                      fieldErrors.contact_email && touched.contact_email
                        ? "border-red-500"
                        : "border-slate-200"
                    }`}
                    placeholder="jane@example.com"
                  />
                  {touched.contact_email &&
                    !fieldErrors.contact_email &&
                    form.contact_email && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2">
                        <FieldCheck />
                      </span>
                    )}
                </div>
                {fieldErrors.contact_email && touched.contact_email && (
                  <p className="text-xs text-red-500 mt-1">
                    {fieldErrors.contact_email}
                  </p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="pa-contact-phone"
                className="block text-xs font-semibold text-slate-600 mb-1"
              >
                Contact Phone
              </label>
              <div className="relative">
                <input
                  id="pa-contact-phone"
                  value={form.contact_phone}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({ ...form, contact_phone: v });
                    if (touched.contact_phone)
                      setFieldErrors((prev) => ({
                        ...prev,
                        contact_phone: validatePhone(v),
                      }));
                  }}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, contact_phone: true }));
                    setFieldErrors((prev) => ({
                      ...prev,
                      contact_phone: validatePhone(form.contact_phone),
                    }));
                  }}
                  aria-invalid={
                    !!fieldErrors.contact_phone && touched.contact_phone
                  }
                  className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm ${
                    fieldErrors.contact_phone && touched.contact_phone
                      ? "border-red-500"
                      : "border-slate-200"
                  }`}
                  placeholder="02 XXXX XXXX or 04XX XXX XXX"
                />
                {touched.contact_phone &&
                  !fieldErrors.contact_phone &&
                  form.contact_phone && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">
                      <FieldCheck />
                    </span>
                  )}
              </div>
              {fieldErrors.contact_phone && touched.contact_phone && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.contact_phone}
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label
                htmlFor="pa-bio"
                className="block text-xs font-semibold text-slate-600 mb-1"
              >
                What courses / training do you offer?
              </label>
              <textarea
                id="pa-bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="e.g. We deliver ASIC-approved ethics CPD, AFSL compliance workshops, and financial planning technical training. Our courses are available online and in-person across Australia..."
              />
              <p className="text-[0.56rem] text-slate-400 mt-0.5">
                Max 2,000 characters
              </p>
            </div>

            {/* CPD Provider Number */}
            <div>
              <label
                htmlFor="pa-cpd-number"
                className="block text-xs font-semibold text-slate-600 mb-1"
              >
                CPD Provider Number{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="pa-cpd-number"
                value={form.cpd_provider_number}
                onChange={(e) =>
                  setForm({ ...form, cpd_provider_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="e.g. FPA-CPD-12345"
              />
              <p className="text-[0.56rem] text-slate-400 mt-0.5">
                If registered with FPA, SMSFA, AFA or similar association as an
                accredited CPD provider.
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
            )}

            <button
              onClick={submit}
              disabled={status === "submitting"}
              className="w-full py-3 bg-teal-700 text-white font-bold rounded-lg text-sm hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === "submitting" ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            Sign in &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
