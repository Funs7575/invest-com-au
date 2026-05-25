import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organisation Portal — Invest.com.au",
  description: "Manage your CPD courses, students, team and payouts.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OrgPortalLayout({ children }: { children: React.ReactNode }) {
  // Do NOT call enforcePortalKind here — org portal uses requireOrgSession
  // inside the "use client" page, not an RSC layout gate. This is because
  // org_admin is a Supabase Auth JWT kind (no legacy cookie), and the
  // session check is done client-side like the advisor portal.
  return <>{children}</>;
}
