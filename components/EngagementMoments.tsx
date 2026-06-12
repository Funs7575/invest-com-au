"use client";

import ShortlistReadySheet from "@/components/ShortlistReadySheet";
import SendOffReturnLoop from "@/components/SendOffReturnLoop";

/**
 * Single mount point for the engagement-moment listeners (Northstar D2 +
 * D3). Bundled as ONE dynamic chunk from LayoutSideEffects — loading them
 * as separate dynamic() imports duplicated their shared dependencies
 * (BottomSheet, Toast engine, celebrate, tracking) across two chunks and
 * tripped the shared-bundle budget.
 */
export default function EngagementMoments() {
  return (
    <>
      <ShortlistReadySheet />
      <SendOffReturnLoop />
    </>
  );
}
