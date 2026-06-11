"use client";

/**
 * app/advisor-portal/onboarding/page.tsx
 *
 * Standalone onboarding route. The portal page.tsx auto-redirects here when
 * the advisor's completeness score is below 40 ("starter" level) AND the
 * localStorage flag `advisor-onboarding-seen` has not been set.
 *
 * After the user completes or dismisses the wizard (at step 3 or later), the
 * flag is set and they are never auto-redirected here again. They can still
 * open the wizard from the dashboard checklist at any time.
 *
 * This page re-uses the same OnboardingWizard component so the UI, field
 * weights, save endpoints, and validation are all identical to the in-portal
 * modal. The only difference is that it renders full-page rather than as an
 * overlay, and it redirects back to the portal on close.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// OnboardingWizard mounts AdvisorPhotoUpload which uses canvas APIs — keep it
// client-only to avoid SSR issues.
const OnboardingWizard = dynamic(() => import("@/app/advisor-portal/OnboardingWizard"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div
          aria-hidden="true"
          className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3"
        />
        <p role="status" className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  ),
});

import type { Advisor } from "@/app/advisor-portal/types";
import { deriveProfileCompleteness } from "@/lib/advisor-portal/profile-completeness";

/** Score threshold below which we auto-redirect to this page. */
const AUTO_REDIRECT_SCORE_THRESHOLD = 40;
/** localStorage key — set once so the auto-redirect never fires again. */
const ONBOARDING_SEEN_KEY = "advisor-onboarding-seen";

export default function OnboardingPage() {
  const router = useRouter();
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadySeen, setAlreadySeen] = useState(false);

  useEffect(() => {
    // If the advisor has already been through onboarding, skip straight back.
    if (typeof window !== "undefined" && localStorage.getItem(ONBOARDING_SEEN_KEY)) {
      setAlreadySeen(true);
      router.replace("/advisor-portal");
      return;
    }

    // Load the advisor session to derive completeness.
    void (async () => {
      try {
        const res = await fetch("/api/advisor-auth/session");
        if (!res.ok) {
          router.replace("/advisor-portal");
          return;
        }
        const { advisor: a } = await res.json() as { advisor: Advisor };
        const completeness = deriveProfileCompleteness(a as unknown as Record<string, unknown>);

        // Only stay on this page if the profile is genuinely below the threshold.
        if (completeness.score >= AUTO_REDIRECT_SCORE_THRESHOLD) {
          // Profile is already past starter level — go to dashboard.
          localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
          router.replace("/advisor-portal");
          return;
        }

        setAdvisor(a);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleClose = () => {
    // Mark as seen so we don't auto-redirect again.
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    }
    router.replace("/advisor-portal");
  };

  if (loading || alreadySeen) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div
            aria-hidden="true"
            className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3"
          />
          <p role="status" className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!advisor) return null;

  return (
    <div className="min-h-screen bg-slate-900/10">
      <OnboardingWizard
        advisor={advisor}
        onAdvisorChange={(updated) => setAdvisor(updated)}
        onClose={handleClose}
      />
    </div>
  );
}
