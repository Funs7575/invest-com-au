import { requireAdmin } from "@/lib/require-admin";
import { redirect } from "next/navigation";
import MfaVerifyClient from "./MfaVerifyClient";

export const dynamic = "force-dynamic";

/**
 * Admin MFA step-up page. Shown by proxy.ts when an authenticated admin
 * lacks a valid admin_mfa_verified cookie. After the admin submits a
 * correct TOTP or recovery code, the verify API route sets the cookie and
 * the client redirects to the originally requested URL.
 *
 * This page is intentionally excluded from the MFA gate in proxy.ts — it
 * must be accessible without a verified cookie, since it IS the flow that
 * produces the cookie.
 */
export default async function AdminMfaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    redirect("/admin/login");
  }

  const { redirect: redirectTo } = await searchParams;
  const safeDest =
    redirectTo && redirectTo.startsWith("/admin") ? redirectTo : "/admin";

  return <MfaVerifyClient adminEmail={guard.email} redirectTo={safeDest} />;
}
