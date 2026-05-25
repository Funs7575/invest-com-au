"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CertificateLookupClient() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmed = value.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter a certificate number.");
      return;
    }

    // Basic format guard: INV-YYYY-NNNNN
    if (!/^INV-\d{4}-\d{5}$/.test(trimmed)) {
      setError(
        "Certificate numbers follow the format INV-YYYY-NNNNN (e.g. INV-2026-00042).",
      );
      return;
    }

    router.push(`/certificate/${trimmed}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
              Certificate Verification
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Enter a certificate number to confirm it was issued by{" "}
              <strong className="text-slate-700">Invest.com.au Academy</strong>.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <form onSubmit={handleSubmit} noValidate>
              <label
                htmlFor="cert-number"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Certificate number
              </label>
              <input
                id="cert-number"
                type="text"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                placeholder="INV-2026-00042"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 font-mono placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                aria-describedby={error ? "cert-error" : "cert-hint"}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
              />

              {error ? (
                <p
                  id="cert-error"
                  role="alert"
                  className="mt-2 text-xs text-red-600"
                >
                  {error}
                </p>
              ) : (
                <p id="cert-hint" className="mt-2 text-xs text-slate-400">
                  Format: INV-YYYY-NNNNN
                </p>
              )}

              <button
                type="submit"
                className="mt-4 w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                Verify certificate
              </button>
            </form>
          </div>

          {/* Footer links */}
          <p className="text-center text-xs text-slate-400 mt-6">
            <Link href="/academy" className="text-teal-600 hover:underline">
              Browse CPD courses
            </Link>
            {" · "}
            <Link href="/advisors" className="text-teal-600 hover:underline">
              Find an advisor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
