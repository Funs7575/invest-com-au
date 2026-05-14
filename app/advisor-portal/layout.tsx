import type { Metadata } from "next";
import { enforcePortalKind } from "@/lib/portal-gate";

export const metadata: Metadata = {
  title: "Advisor Portal — Invest.com.au",
  description: "Manage your leads, profile, and billing on Invest.com.au's advisor directory.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdvisorPortalLayout({ children }: { children: React.ReactNode }) {
  await enforcePortalKind("advisor");
  return <>{children}</>;
}
