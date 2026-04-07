"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { TopBar } from "@/components/layout/TopBar";
import { Navigation } from "@/components/layout/Navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";

// Lazy-load below-fold and event-driven components
const CookieBanner = dynamic(() => import("@/components/CookieBanner"), { ssr: false });
const BackToTop = dynamic(() => import("@/components/BackToTop"), { ssr: false });
const QuizPromptBar = dynamic(() => import("@/components/QuizPromptBar"), { ssr: false });
const ExitIntentPopup = dynamic(() => import("@/components/ExitIntentPopup"), { ssr: false });
const StickyAdFooter = dynamic(() => import("@/components/StickyAdFooter"), { ssr: false });
const TrackingPixels = dynamic(() => import("@/components/TrackingPixels"), { ssr: false });


export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <TopBar />
      <Navigation />
      <main id="main-content" className="min-h-screen pb-14 sm:pb-0">{children}</main>
      <SiteFooter />
      <CookieBanner />
      <BackToTop />
      <QuizPromptBar />
      <ExitIntentPopup />
      <StickyAdFooter />
      <TrackingPixels />
    </>
  );
}
