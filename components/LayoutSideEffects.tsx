"use client";

import dynamic from "next/dynamic";

// Lazy-load the five side-effect-only client components that
// app/layout.tsx previously imported eagerly. Each component returns
// `null` (no UI — just a useEffect) so SSR rendering them costs JS
// bytes for zero visible output. `ssr: false` skips that, and each
// dynamic() call puts the component into its own client chunk that
// loads only after hydration. Frees ~15-25 kB + ~50-150 ms TBT from
// the critical-path layout bundle.
//
// `dynamic({ ssr: false })` is only valid inside a client component
// (per Next.js 14+), which is why this wrapper exists — app/layout.tsx
// is a server component.
const UtmCapture = dynamic(() => import("@/components/UtmCapture"), {
  ssr: false,
});
const RouteChangeFocus = dynamic(
  () => import("@/components/RouteChangeFocus"),
  { ssr: false },
);
const ServiceWorkerRegistrar = dynamic(
  () => import("@/components/ServiceWorkerRegistrar"),
  { ssr: false },
);
const ClaimAnonymousOnAuth = dynamic(
  () => import("@/components/ClaimAnonymousOnAuth"),
  { ssr: false },
);
const WebVitals = dynamic(() => import("@/components/WebVitals"), {
  ssr: false,
});

// Same treatment for Vercel Speed Insights (~8 kB) — telemetry only,
// no UI, no need to ship in the critical-path chunk.
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((m) => m.SpeedInsights),
  { ssr: false },
);

const UserOnboarding = dynamic(
  () => import("@/components/UserOnboarding"),
  { ssr: false },
);

export default function LayoutSideEffects() {
  return (
    <>
      <UtmCapture />
      <RouteChangeFocus />
      <ServiceWorkerRegistrar />
      <ClaimAnonymousOnAuth />
      <WebVitals />
      <SpeedInsights />
      <UserOnboarding />
    </>
  );
}
