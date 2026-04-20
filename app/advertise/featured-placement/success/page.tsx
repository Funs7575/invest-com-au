import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking confirmed — invest.com.au",
  robots: { index: false, follow: false },
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full bg-white border border-emerald-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-9 h-9 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
          Your placement is booked.
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Thanks — we&apos;ve received your payment. A confirmation email
          with your invoice is on its way. Your sponsored slot will go live
          on your selected start date.
        </p>
        <div className="flex flex-col gap-2.5">
          <Link
            href="/broker-portal/sponsored-slots"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            Track this campaign →
          </Link>
          <Link
            href="/advertise/featured-placement"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-amber-300 text-slate-700 font-semibold rounded-lg text-sm transition-colors"
          >
            Book another slot
          </Link>
        </div>
        {session_id && (
          <p className="text-[11px] text-slate-400 mt-6 font-mono">
            Reference: {session_id.slice(0, 24)}…
          </p>
        )}
      </div>
    </div>
  );
}
