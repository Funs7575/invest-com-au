import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Find the Right Advisor for You (${CURRENT_YEAR})`,
  description: "Answer 3 quick questions and we'll match you with the right type of financial professional — SMSF accountants, financial planners, property advisors, and more.",
  openGraph: {
    title: "Find an Advisor — Invest.com.au",
    description: "Answer 3 questions and find the right financial professional for your situation.",
  },
  twitter: { card: "summary" },
  alternates: { canonical: "/find-advisor" },
};

export default function FindAdvisorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
