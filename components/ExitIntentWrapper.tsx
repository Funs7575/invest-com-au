"use client";

import { Suspense } from "react";
import ExitIntentCapture from "@/components/ExitIntentCapture";
import ExitIntentBrokerMatch from "@/components/ExitIntentBrokerMatch";

/**
 * Client wrapper that renders both exit-intent components together.
 *
 * ExitIntentCapture fires first (15 s dwell, mouse-leave / 60% scroll).
 * ExitIntentBrokerMatch fires if the email popup hasn't already shown
 * (20 s dwell, mouse-leave / popstate). They share sessionStorage keys
 * so they never double-fire in the same session.
 *
 * Gated behind the `exit_intent_broker_match` feature flag in layout.tsx
 * so rollout can be controlled without a deploy. Rendered in a <Suspense>
 * to keep it off the critical render path.
 */
export default function ExitIntentWrapper() {
  return (
    <Suspense fallback={null}>
      <ExitIntentCapture />
      <ExitIntentBrokerMatch />
    </Suspense>
  );
}
