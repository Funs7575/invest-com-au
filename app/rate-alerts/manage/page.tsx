import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

import ManagePrefsClient from "./ManagePrefsClient";

// Tokenised manage-preferences page linked from every rate-alert email.
// Works without a login — possession of the emailed token is the proof of
// email control. Token URLs must never be indexed.

export const metadata: Metadata = {
  title: "Manage your rate alerts",
  description: "Change frequency, pause, or unsubscribe from rate alerts.",
  robots: { index: false, follow: false },
};

export default function ManageRateAlertsPage() {
  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-2xl">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-500 md:mb-6 md:text-sm">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/rate-alerts" className="hover:text-slate-900">
            Rate Alerts
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Manage</span>
        </nav>

        <h1 className="mb-2 text-xl font-extrabold text-slate-900 md:text-3xl">
          Manage your rate alerts
        </h1>
        <p className="mb-6 text-sm text-slate-600">
          Change how often you hear from us, pause an alert, or unsubscribe —
          no login needed.
        </p>

        <Suspense
          fallback={
            <div aria-hidden="true" className="h-64 rounded-2xl bg-slate-100" />
          }
        >
          <ManagePrefsClient />
        </Suspense>

        <p className="mt-8 text-center text-[0.7rem] text-slate-500">
          {GENERAL_ADVICE_WARNING}
        </p>
      </div>
    </div>
  );
}
