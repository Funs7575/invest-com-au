import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advisor Portal — Invest.com.au",
  description: "Manage your leads, profile, and billing on Invest.com.au's advisor directory.",
  robots: { index: false, follow: false },
};

export default function AdvisorPortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
