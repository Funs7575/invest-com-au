"use client";

import { useSubscription } from "@/lib/hooks/useSubscription";
import Link from "next/link";

export default function CoursesGate({ children }: { children: React.ReactNode }) {
  const { user, isPro, loading } = useSubscription();

  if (loading) {
    return (
      <div className="py-12">
        <div className="container-custom max-w-6xl text-center">
          <div className="h-8 bg-slate-100 rounded w-48 mx-auto mb-4 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-64 mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="py-12">
        <div className="container-custom max-w-lg mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-4">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            INVESTOR PRO
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3">
            Pro-Only Courses
          </h1>
          <p className="text-slate-600 mb-6">
            Expert-led investing courses are exclusively available to Investor Pro members. Upgrade to access premium courses from Australian market professionals.
          </p>
          <Link
            href="/pro"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-700 text-white font-bold text-sm rounded-xl hover:bg-green-800 transition-colors"
          >
            {user ? "Upgrade to Pro" : "Sign In & Subscribe"}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          {!user && (
            <p className="text-xs text-slate-400 mt-3">
              Already a Pro member?{" "}
              <Link href="/auth/login?next=/courses" className="text-green-700 underline hover:text-green-800">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
