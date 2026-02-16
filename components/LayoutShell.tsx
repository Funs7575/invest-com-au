"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import BackToTop from "@/components/BackToTop";
import QuizPromptBar from "@/components/QuizPromptBar";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import SocialProofToast from "@/components/SocialProofToast";
import Link from "next/link";

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
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-green-700 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Disclosure Bar */}
      <div className="bg-slate-50 border-b border-slate-200 py-2 text-center text-xs text-slate-600">
        <div className="container-custom">
          We may receive a commission from partners. This does not affect our rankings.{" "}
          <Link href="/how-we-earn" className="text-green-700 hover:text-green-800 underline transition-colors">
            How we make money
          </Link>
          {" · "}
          <Link href="/about" className="text-green-700 hover:text-green-800 underline transition-colors">
            About us
          </Link>
        </div>
      </div>

      <Header />
      <main id="main-content" className="min-h-screen">{children}</main>
      <Footer />
      <CookieBanner />
      <BackToTop />
      <QuizPromptBar />
      <ExitIntentPopup />
      <SocialProofToast />
    </>
  );
}
