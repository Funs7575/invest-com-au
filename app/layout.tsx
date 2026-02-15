import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieBanner from "@/components/CookieBanner";
import BackToTop from "@/components/BackToTop";
import QuizPromptBar from "@/components/QuizPromptBar";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Invest.com.au — Australia's Independent Broker Comparison",
  description: "Compare Australia's best share trading platforms. Honest reviews, fee calculators, and CHESS-sponsored broker comparisons. No bank bias.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Disclosure Bar */}
        <div className="bg-slate-50 border-b border-slate-200 py-2 text-center text-xs text-slate-600">
          <div className="container-custom">
            We may receive a commission from partners. This does not affect our rankings.{" "}
            <Link href="/how-we-earn" className="text-amber hover:text-amber-600 underline transition-colors">
              How we make money
            </Link>
            {" · "}
            <Link href="/about" className="text-amber hover:text-amber-600 underline transition-colors">
              About us
            </Link>
          </div>
        </div>

        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
        <CookieBanner />
        <BackToTop />
        <QuizPromptBar />
      </body>
    </html>
  );
}
