"use client";

import { useState } from "react";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useCourseAccess } from "@/lib/hooks/useCourseAccess";
import type { Course } from "@/lib/types";
import Link from "next/link";

interface Props {
  course: Course;
}

export default function CoursePageClient({ course }: Props) {
  const { user, isPro, loading: subLoading } = useSubscription();
  const { hasCourse, loading: courseLoading } = useCourseAccess(course.slug);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");

  const loading = subLoading || courseLoading;
  const priceInCents = isPro && course.pro_price ? course.pro_price : course.price;
  const priceDisplay = (priceInCents / 100).toFixed(0);
  const fullPriceDisplay = (course.price / 100).toFixed(0);
  const proPriceDisplay = course.pro_price ? (course.pro_price / 100).toFixed(0) : null;

  const handlePurchase = async () => {
    if (!user) {
      window.location.href = `/auth/login?next=/courses/${course.slug}`;
      return;
    }

    setError("");
    setPurchasing(true);
    try {
      const res = await fetch("/api/course/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_slug: course.slug }),
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
          href={`/courses/${course.slug}`}
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
      {isPro && proPriceDisplay && (
        <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-4">
          Pro Discount Applied
        </div>
      )}

      <div className="mb-4">
        {isPro && proPriceDisplay ? (
          <>
            <span className="text-lg text-slate-400 line-through mr-2">${fullPriceDisplay}</span>
            <span className="text-4xl font-extrabold text-green-800">${proPriceDisplay}</span>
          </>
        ) : (
          <span className="text-4xl font-extrabold text-green-800">${fullPriceDisplay}</span>
        )}
        <span className="text-sm text-slate-500 ml-1">{course.currency}</span>
      </div>

      <p className="text-xs text-slate-500 mb-1">One-time payment · Lifetime access</p>
      {course.guarantee && (
        <p className="text-xs text-slate-500 mb-6">{course.guarantee}</p>
      )}

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
            ? `Buy Course — $${priceDisplay}`
            : "Sign In to Purchase"}
      </button>

      {!user && (
        <p className="text-xs text-slate-400 mt-3">
          Already have an account?{" "}
          <Link href={`/auth/login?next=/courses/${course.slug}`} className="text-green-700 underline hover:text-green-800">
            Sign in
          </Link>
        </p>
      )}

      {!isPro && user && proPriceDisplay && (
        <p className="text-xs text-slate-400 mt-3">
          <Link href="/pro" className="text-amber-600 underline hover:text-amber-700">
            Investor Pro members
          </Link>{" "}
          save ${(course.price - (course.pro_price || course.price)) / 100} on this course.
        </p>
      )}

      <ul className="mt-6 space-y-2 text-left">
        {[
          `${course.estimated_hours ? `~${course.estimated_hours} hours of` : ""} expert content`.trim(),
          "Practical, Australia-specific lessons",
          "Lifetime access + future updates",
          ...(course.guarantee ? [course.guarantee.replace(/\.$/, "")] : []),
        ].filter(Boolean).map((item) => (
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
