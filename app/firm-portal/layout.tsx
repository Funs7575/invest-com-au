/**
 * Layout for /firm-portal/* — renders the shared sibling-nav strip
 * (Performance · Billing · Jobs · Analytics) above every firm-admin page so
 * the four surfaces are mutually reachable (P2-5). Previously the strip lived
 * only on /firm-portal/analytics.
 *
 * Thin + additive: it does NOT gate access (each page keeps its own two-stage
 * firm-admin auth gate) and exports no metadata (each page exports its own).
 * The /firm-portal index page redirects before this nav ever paints.
 */
import FirmPortalNav from "./_components/FirmPortalNav";

export default function FirmPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <FirmPortalNav />
      {children}
    </>
  );
}
