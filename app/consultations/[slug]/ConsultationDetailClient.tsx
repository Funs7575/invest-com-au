"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/lib/hooks/useSubscription";
import type { Consultation } from "@/lib/types";
import Link from "next/link";

interface Props {
  consultation: Consultation;
}

export default function ConsultationDetailClient({ consultation }: Props) {
  const searchParams = useSearchParams();
  const { user, isPro, loading: subLoading } = useSubscription();
  const [booking, setBooking] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);

  // Check for ?booked=true from Stripe redirect
  useEffect(() => {
    if (searchParams.get("booked") === "true") {
      setShowBookingSuccess(true);
      window.history.replaceState(
        {},
        "",
        `/consultations/${consultation.slug}`
      );
    }
  }, [searchParams, consultation.slug]);

  // Fetch existing booking
  const fetchBooking = useCallback(async () => {
    if (!user) {
      setBookingLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/consultation/bookings?consultation_id=${consultation.id}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.booking) {
          setBooking(data.booking);
        }
      }
    } catch {
      // Silently fail — user just won't see existing booking
    }
    setBookingLoading(false);
  }, [user, consultation.id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const loading = subLoading || bookingLoading;
  const priceInCents =
    isPro && consultation.pro_price ? consultation.pro_price : consultation.price;
  const priceDisplay = (priceInCents / 100).toFixed(0);
  const fullPriceDisplay = (consultation.price / 100).toFixed(0);
  const proPriceDisplay = consultation.pro_price
    ? (consultation.pro_price / 100).toFixed(0)
    : null;
  const hasDiscount = isPro && consultation.pro_price && consultation.pro_price < consultation.price;

  const handlePurchase = async () => {
    if (!user) {
      window.location.href = `/auth/login?next=/consultations/${consultation.slug}`;
      return;
    }

    setError("");
    setPurchasing(true);
    try {
      const res = await fetch("/api/consultation/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_slug: consultation.slug }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setPurchasing(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setPurchasing(false);
    }
  };

  // Already booked — show booking status + Cal embed
  if (!loading && (booking || showBookingSuccess)) {
    return (
      <div>
        {showBookingSuccess && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
            <p className="text-sm font-semibold text-emerald-800">
              Payment successful! Now pick a time for your session.
            </p>
          </div>
        )}

        <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-6 text-center mb-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-emerald-700"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-emerald-800 mb-1">
            Session Booked
          </h3>
          <p className="text-sm text-slate-600">
            {booking?.status === "confirmed"
              ? "Choose a time below to schedule your session."
              : "Your session is confirmed."}
          </p>
        </div>

        {/* Cal.com embed */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h4 className="font-semibold text-sm text-slate-700">
              Pick a Time
            </h4>
          </div>
          <div className="min-h-[500px]">
            <iframe
              src={`https://cal.com/${consultation.cal_link}?embed=true&layout=month_view&theme=light`}
              style={{ width: "100%", height: "500px", border: "none" }}
              title="Schedule your consultation"
              allow="camera; microphone"
            />
          </div>
        </div>
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-center animate-pulse">
        <div className="h-10 bg-slate-100 rounded-lg w-32 mx-auto mb-4" />
        <div className="h-4 bg-slate-100 rounded w-48 mx-auto mb-2" />
        <div className="h-4 bg-slate-100 rounded w-40 mx-auto mb-6" />
        <div className="h-12 bg-slate-100 rounded-lg w-full mb-4" />
      </div>
    );
  }

  // Not yet purchased — show pricing CTA
  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-6 text-center">
      {hasDiscount && (
        <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-4">
          Pro Discount Applied
        </div>
      )}

      <div className="mb-3">
        {hasDiscount ? (
          <>
            <span className="text-lg text-slate-400 line-through mr-2">
              ${fullPriceDisplay}
            </span>
            <span className="text-4xl font-extrabold text-emerald-800">
              ${proPriceDisplay}
            </span>
          </>
        ) : (
          <span className="text-4xl font-extrabold text-emerald-800">
            ${fullPriceDisplay}
          </span>
        )}
        <span className="text-sm text-slate-500 ml-1">AUD</span>
      </div>

      <p className="text-xs text-slate-500 mb-1">
        {consultation.duration_minutes}-minute 1-on-1 session
      </p>
      <p className="text-xs text-slate-500 mb-5">
        Pay once · Schedule after payment
      </p>

      {error && (
        <div
          role="alert"
          className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
        >
          {error}
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={purchasing}
        className="w-full py-3 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {purchasing
          ? "Redirecting to checkout..."
          : user
            ? `Pay & Book — $${priceDisplay}`
            : "Sign In to Book"}
      </button>

      {!user && (
        <p className="text-xs text-slate-400 mt-3">
          Already have an account?{" "}
          <Link
            href={`/auth/login?next=/consultations/${consultation.slug}`}
            className="text-emerald-700 underline hover:text-emerald-800"
          >
            Sign in
          </Link>
        </p>
      )}

      {!isPro && user && proPriceDisplay && (
        <p className="text-xs text-slate-400 mt-3">
          <Link
            href="/pro"
            className="text-amber-600 underline hover:text-amber-700"
          >
            Investor Pro members
          </Link>{" "}
          save $
          {((consultation.price - (consultation.pro_price || consultation.price)) / 100).toFixed(0)}{" "}
          on this session.
        </p>
      )}

      <ul className="mt-6 space-y-2 text-left">
        {[
          `${consultation.duration_minutes}-minute video call`,
          "Personalised, actionable advice",
          "Follow-up summary via email",
          "Schedule at your convenience",
        ].map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-xs text-slate-600"
          >
            <svg
              className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

