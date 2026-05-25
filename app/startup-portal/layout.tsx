import type { Metadata } from "next";
import { enforcePortalKind } from "@/lib/portal-gate";

export const metadata: Metadata = {
  title: "Founder Portal — Invest.com.au",
  description: "Manage your startup round, data room, and investor pipeline.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function StartupPortalLayout({ children }: { children: React.ReactNode }) {
  await enforcePortalKind("startup");
  return <>{children}</>;
}
