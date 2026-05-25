import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Booking Confirmed | Invest.com.au",
  robots: { index: false },
};

export default function BookingSuccessPage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Session Confirmed!</h1>
        <p className="text-slate-600 mb-6">
          Your payment was successful and your consultation slot is booked. Your advisor will
          be in touch to confirm the meeting details.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-slate-500 mb-1">What happens next</p>
          <ul className="text-sm text-slate-700 space-y-1">
            <li>✉️ Check your email for a booking confirmation</li>
            <li>📞 Your advisor will contact you to confirm meeting details</li>
            <li>📅 Add the session to your calendar</li>
          </ul>
        </div>
        <Link
          href="/find/financial-advisor"
          className="text-sm text-violet-600 hover:text-violet-800 font-medium underline"
        >
          Find more advisors →
        </Link>
      </div>
    </main>
  );
}
