/**
 * /embed-portal — embed_customer workspace shell (Phase 4.4).
 *
 * Gate ensures the visitor holds the embed_customer account kind
 * AND the iv_active_kind cookie matches. Wraps every page under
 * /embed-portal/*.
 */

import type { Metadata } from "next";
import { enforcePortalKind } from "@/lib/portal-gate";

export const metadata: Metadata = {
  title: "Embed portal — Invest.com.au",
  robots: { index: false, follow: false },
};

export default async function EmbedPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await enforcePortalKind("embed_customer");
  return <>{children}</>;
}
