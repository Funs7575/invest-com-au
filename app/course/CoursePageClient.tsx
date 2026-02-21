"use client";

import { useState } from "react";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useCourseAccess } from "@/lib/hooks/useCourseAccess";
import { COURSE_CONFIG } from "@/lib/course";
import Link from "next/link";

export default function CoursePageClient() {
  const { user, isPro, loading: subLoading } = useSubscription();
  const { hasCourse, loading: courseLoading } = useCourseAccess();
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");

  const loading = subLoading || courseLoading;
  const price = isPro ? COURSE_CONFIG.proPrice : COURSE_CONFIG.price;

  const handlePurchase = async () => {
    if (!user) {
      window.location.href = "/auth/login?next=/course";
      return;
    }

    setError("");
    setPurchasing(true);
    try {
      const res = await fetch("/api/course/purchase", { method: "POST" });
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

  // Already purchased — show access CTA
  if (!loading && hasCourse) {
    return (
      <div className="max-w-md mx-auto rounded-2xl border-2 border-green-300 bg-gradient-to-b from-green-50 to-white p-8 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-700" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-2">You Own This Course</h3>
        <p className="text-sm text-slate-600 mb-6">
          Continue where you left off or start from the beginning.
        </p>
        <Link
          href="/course/what-is-the-asx"
          className="inline-block w-full py-3 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] transition-all duration-200"
        >
          Go to Lessons →
        </Link>
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-md mx-auto rounded-2xl border-2 border-slate-200 bg-white p-8 text-center animate-pulse">
        <div className="h-10 bg-slate-100 rounded-lg w-32 mx-auto mb-4" />
        <div className="h-4 bg-slate-100 rounded w-48 mx-auto mb-2" />
        <div className="h-4 bg-slate-100 rounded w-40 mx-auto mb-6" />
        <div className="h-12 bg-slate-100 rounded-lg w-full mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto rounded-2xl border-2 border-green-300 bg-gradient-to-b from-green-50 to-white p-8 text-center">
      {isPro && (
        <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-4">
          Pro Discount Applied
        </div>
      )}

      <div className="mb-4">
        {isPro ? (
          <>
            <span className="text-lg text-slate-400 line-through mr-2">${COURSE_CONFIG.price}</span>
            <span className="text-4xl font-extrabold text-green-800">${COURSE_CONFIG.proPrice}</span>
          </>
        ) : (
          <span className="text-4xl font-extrabold text-green-800">${COURSE_CONFIG.price}</span>
        )}
        <span className="text-sm text-slate-500 ml-1">AUD</span>
      </div>

      <p className="text-xs text-slate-500 mb-1">One-time payment · Lifetime access</p>
      <p className="text-xs text-slate-500 mb-6">{COURSE_CONFIG.guarantee}</p>

      {error && (
        <div role="alert" className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={purchasing}
        className="w-full py-3 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {purchasing
          ? "Redirecting to checkout..."
          : user
            ? `Buy Course — $${price}`
            : "Sign In to Purchase"}
      </button>

      {!user && (
        <p className="text-xs text-slate-400 mt-3">
          Already have an account?{" "}
          <Link href="/auth/login?next=/course" className="text-green-700 underline hover:text-green-800">
            Sign in
          </Link>
        </p>
      )}

      {!isPro && user && (
        <p className="text-xs text-slate-400 mt-3">
          <Link href="/pro" className="text-amber-600 underline hover:text-amber-700">
            Investor Pro members
          </Link>{" "}
          save $100 on this course.
        </p>
      )}

      <ul className="mt-6 space-y-2 text-left">
        {[
          "6 modules, 18 expert-written lessons",
          "Practical, Australia-specific content",
          "Lifetime access + future updates",
          "30-day money-back guarantee",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
            <svg className="w-4 h-4 text-green-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
