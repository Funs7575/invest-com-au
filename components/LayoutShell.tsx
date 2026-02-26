"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DisclosureBanner from "@/components/DisclosureBanner";

// Lazy-load below-fold and event-driven components
const CookieBanner = dynamic(() => import("@/components/CookieBanner"), { ssr: false });
const BackToTop = dynamic(() => import("@/components/BackToTop"), { ssr: false });
const QuizPromptBar = dynamic(() => import("@/components/QuizPromptBar"), { ssr: false });
const ExitIntentPopup = dynamic(() => import("@/components/ExitIntentPopup"), { ssr: false });
const StickyAdFooter = dynamic(() => import("@/components/StickyAdFooter"), { ssr: false });


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
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-slate-900 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <DisclosureBanner variant="header" />

      <Header />
      <main id="main-content" className="min-h-screen pb-20 sm:pb-0">{children}</main>
      <Footer />
      <CookieBanner />
      <BackToTop />
      <QuizPromptBar />
      <ExitIntentPopup />
      <StickyAdFooter />
    </>
  );
}
