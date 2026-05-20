/**
 * /wholesale-portal — wholesale_operator workspace shell (Phase 4.2).
 *
 * Gate ensures the visitor holds the wholesale_operator account kind
 * AND the iv_active_kind cookie matches. Wraps every page under
 * /wholesale-portal/*.
 */

import { enforcePortalKind } from "@/lib/portal-gate";

export default async function WholesalePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await enforcePortalKind("wholesale_operator");
  return <>{children}</>;
}
