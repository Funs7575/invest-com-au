"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const PACKAGES = [
  {
    key: "sponsored-article",
    name: "Sponsored Article",
    price: "$500",
    priceNote: "one-time",
    description:
      "Written article featured on the site for 30 days. Includes a backlink to your website and a call-to-action directing readers to your services.",
    icon: "file-text",
  },
  {
    key: "calculator-sponsorship",
    name: "Calculator Sponsorship",
    price: "$300",
    priceNote: "per month",
    description:
      "Your brand displayed on a specific calculator page with a CTA linking to your advisory services. High-intent traffic from investors running numbers.",
    icon: "calculator",
  },
  {
    key: "directory-feature",
    name: "Directory Feature",
    price: "$200",
    priceNote: "per month",
    description:
      "Featured placement in the advisor directory for your category and location. Stand out from other advisors with a highlighted listing.",
    icon: "star",
  },
] as const;

type PackageKey = (typeof PACKAGES)[number]["key"];

interface FormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  message: string;
}

export default function SponsoredClient() {
  const [selectedPackage, setSelectedPackage] = useState<PackageKey | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPackage) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sponsored-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          package: selectedPackage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="check-circle" size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
            Booking Request Received
          </h1>
          <p className="text-slate-600 mb-6">
            Thanks for your interest in sponsored content on Invest.com.au. Our
            team will review your request and get back to you within 1-2 business
            days.
          </p>
          <Link
            href="/for-advisors"
            className="inline-block px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all"
          >
            Back to For Advisors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 text-white py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-violet-200 text-sm font-semibold mb-3 uppercase tracking-wider">
            Sponsored Content
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            Reach Clients at the<br />Point of Decision
          </h1>
          <p className="text-lg md:text-xl text-violet-100 mb-6 max-w-2xl mx-auto leading-relaxed">
            Put your brand in front of Australian investors when they are
            actively researching investment options, comparing platforms, and
            calculating returns.
          </p>
        </div>
      </section>

      {/* Packages */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10">
            Sponsorship Packages
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {PACKAGES.map((pkg) => {
              const isSelected = selectedPackage === pkg.key;
              return (
                <div
                  key={pkg.key}
                  className={`relative bg-white rounded-2xl p-6 md:p-8 flex flex-col cursor-pointer transition-all ${
                    isSelected
                      ? "ring-2 ring-violet-500 shadow-lg shadow-violet-100"
                      : "border border-slate-200 hover:border-violet-300 shadow-sm"
                  }`}
                  onClick={() => setSelectedPackage(pkg.key)}
                >
                  <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon name={pkg.icon} size={22} className="text-violet-600" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-1">
                    {pkg.name}
                  </h3>
                  <div className="mb-3">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {pkg.price}
                    </span>
                    <span className="text-slate-500 text-sm ml-1">
                      {pkg.priceNote}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed flex-1 mb-4">
                    {pkg.description}
                  </p>
                  <button
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                      isSelected
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Booking form */}
          <div className="max-w-xl mx-auto">
            <h2 className="text-xl md:text-2xl font-extrabold text-center mb-6">
              Book Your Sponsorship
            </h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Company *
                  </label>
                  <input
                    type="text"
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Selected Package
                </label>
                <div className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-600">
                  {selectedPackage
                    ? PACKAGES.find((p) => p.key === selectedPackage)?.name
                    : "Select a package above"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Message / Notes
                </label>
                <textarea
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your goals, target audience, or any specific requirements..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!selectedPackage || submitting}
                className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl text-sm hover:bg-violet-700 transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Booking Request"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
