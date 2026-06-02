import { redirect } from "next/navigation";

/**
 * Bare `/firm-portal` had no index route (404). Send firm admins to their
 * performance dashboard; that page's own auth gate handles unauthenticated
 * visitors (redirects them to login).
 */
export default function FirmPortalIndexPage() {
  redirect("/firm-portal/performance");
}
