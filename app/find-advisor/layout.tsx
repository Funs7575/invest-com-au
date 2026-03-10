import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Find the Right Advisor for You (${CURRENT_YEAR})`,
  description: "Answer 3 quick questions to find the right financial professional — SMSF accountants, financial planners, property advisors and more.",
  openGraph: {
    title: "Find an Advisor — Invest.com.au",
    description: "Answer 3 questions and find the right financial professional for your situation.",
    images: [{ url: "/api/og?title=Find+Your+Advisor&subtitle=3+questions.+Instant+match.&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary" },
  alternates: { canonical: "/find-advisor" },
};

export default function FindAdvisorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
