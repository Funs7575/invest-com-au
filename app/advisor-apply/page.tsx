"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export default function AdvisorApplyPage() {
  const [accountType, setAccountType] = useState<"individual" | "firm">("individual");
  const [form, setForm] = useState({
    name: "", firm_name: "", email: "", phone: "", type: "financial_planner",
    afsl_number: "", registration_number: "", location_state: "",
    location_suburb: "", specialties: "", bio: "", website: "", fee_description: "",
    abn: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    if (!form.name || !form.email || !form.type) {
      setErrorMsg("Name, email, and advisor type are required.");
      return;
    }
    if (accountType === "firm" && !form.firm_name) {
      setErrorMsg("Firm name is required for firm applications.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/advisor-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, account_type: accountType }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
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
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Application Submitted!</h1>
          <p className="text-slate-500 mb-6">We&apos;ll review your credentials and get back to you within 48 hours. Check your email for confirmation.</p>
          <Link href="/advisors" className="text-sm text-amber-600 hover:text-amber-700 font-semibold">← Back to Advisor Directory</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-2xl">
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/advisors" className="hover:text-slate-900">Advisors</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Apply</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-5 md:p-8 mb-6 md:mb-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative">
            <h1 className="text-xl md:text-3xl font-extrabold mb-2">Get Listed on Invest.com.au</h1>
            <p className="text-sm md:text-base text-violet-200 mb-4 leading-relaxed max-w-lg">
              Join our advisor directory and connect with Australian investors looking for professional advice.
            </p>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                { icon: "gift", title: "Free Listing", desc: "No upfront cost" },
                { icon: "users", title: "Qualified Leads", desc: "Investors seeking help" },
                { icon: "shield", title: "Verified Badge", desc: "ASIC/TPB checked" },
              ].map((v, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-lg p-2.5 md:p-3 text-center">
                  <Icon name={v.icon} size={18} className="text-violet-200 mx-auto mb-1" />
                  <div className="text-[0.62rem] md:text-xs font-bold text-white">{v.title}</div>
                  <div className="text-[0.5rem] md:text-[0.62rem] text-violet-300">{v.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
          <div className="space-y-4">
            {/* Account Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">I&apos;m applying as *</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setAccountType("individual")} className={`p-3 rounded-lg border-2 text-left transition-all ${accountType === "individual" ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="user" size={16} className={accountType === "individual" ? "text-slate-900" : "text-slate-400"} />
                    <span className="text-sm font-bold text-slate-900">Individual Advisor</span>
                  </div>
                  <p className="text-[0.62rem] text-slate-500">Solo practitioner or authorised rep</p>
                </button>
                <button type="button" onClick={() => setAccountType("firm")} className={`p-3 rounded-lg border-2 text-left transition-all ${accountType === "firm" ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="building" size={16} className={accountType === "firm" ? "text-slate-900" : "text-slate-400"} />
                    <span className="text-sm font-bold text-slate-900">Firm / Brokerage</span>
                  </div>
                  <p className="text-[0.62rem] text-slate-500">Register your firm & invite team members</p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{accountType === "firm" ? "Your Full Name *" : "Full Name *"}</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Sarah Chen" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{accountType === "firm" ? "Firm Name *" : "Firm Name"}</label>
                <input value={form.firm_name} onChange={(e) => setForm({ ...form, firm_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Chen Advisory" />
              </div>
            </div>

            {/* Firm-specific fields */}
            {accountType === "firm" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ABN</label>
                  <input value={form.abn} onChange={(e) => setForm({ ...form, abn: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="XX XXX XXX XXX" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Firm Website</label>
                  <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="https://..." />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="sarah@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="04XX XXX XXX" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Advisor Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {Object.entries(PROFESSIONAL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">AFSL Number</label>
                <input value={form.afsl_number} onChange={(e) => setForm({ ...form, afsl_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. 234567" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Registration / TAN</label>
                <input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="For tax agents" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
                <select value={form.location_state} onChange={(e) => setForm({ ...form, location_state: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                  <option value="">Select...</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Suburb</label>
                <input value={form.location_suburb} onChange={(e) => setForm({ ...form, location_suburb: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Sydney CBD" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Specialties</label>
              <input value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="SMSF Setup, Retirement Planning, ETF Portfolios" />
              <p className="text-[0.56rem] text-slate-400 mt-0.5">Comma-separated</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Short Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Tell investors about your experience and approach..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
                <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fee Range</label>
                <input value={form.fee_description} onChange={(e) => setForm({ ...form, fee_description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. SOA from $3,300" />
              </div>
            </div>

            {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

            <button
              onClick={submit}
              disabled={status === "submitting"}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {status === "submitting" ? "Submitting..." : "Submit Application"}
            </button>
          </div>

          <p className="text-[0.56rem] text-slate-400 mt-3 text-center leading-relaxed">
            By submitting, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
            We&apos;ll verify your AFSL/registration before activating your listing.
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Already listed? <Link href="/advisor-portal" className="text-slate-600 hover:text-slate-900 font-medium">Log in to your portal →</Link>
        </p>
      </div>
    </div>
  );
}
