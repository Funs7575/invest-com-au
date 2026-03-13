"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DisclosureBanner from "@/components/DisclosureBanner";
import Icon from "@/components/Icon";

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

      {/* Trust Notification Bar */}
      <div className="bg-slate-900 text-slate-300 py-2 px-4 text-center text-[13px] font-semibold tracking-wide flex items-center justify-center gap-6 border-b border-slate-800">
        <span className="flex items-center gap-2">
          <Icon name="shield-check" size={16} className="text-emerald-400" />
          <span className="hidden sm:inline">100% Independent &amp; Free Service</span>
          <span className="sm:hidden">Independent &amp; Free</span>
        </span>
        <span className="hidden md:flex items-center gap-2 text-slate-400 border-l border-slate-700 pl-6">
          <Icon name="shield-check" size={16} className="text-amber-500" />
          113+ ASIC-Verified Professionals
        </span>
      </div>

      <Header />
      <main id="main-content" className="min-h-screen pb-14 sm:pb-0">{children}</main>
      <Footer />
      <CookieBanner />
      <BackToTop />
      <QuizPromptBar />
      <ExitIntentPopup />
      <StickyAdFooter />
    </>
  );
}
