import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin";
import { listPendingReviewListings } from "@/lib/listings";
import ModerationQueueClient from "./ModerationQueueClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Listings Moderation Queue — Admin",
  robots: "noindex, nofollow",
};

/**
 * /admin/listings/moderation — moderation queue for owner-driven listings.
 *
 * Server-side admin check (admin email allow-list). API routes additionally
 * verify via requireAdmin() so this page is defense-in-depth, not the
 * primary security gate.
 *
 * Distinct from /admin/listings (the legacy investment_listings dashboard)
 * — this surface drives the new reverse-flow primitive introduced in
 * migration 20260514_mm12_listings.sql.
 */
export default async function ListingsModerationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/account/login?redirect=/admin/listings/moderation");
  }
  if (!getAdminEmails().includes(user.email.toLowerCase())) {
    redirect("/account");
  }

  const items = await listPendingReviewListings();

  return (
    <div className="py-6 md:py-10">
      <div className="container-custom max-w-4xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin" className="hover:text-slate-900">
            ← Admin home
          </Link>
        </nav>

        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Listings moderation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Owner-submitted listings awaiting review. Approve to publish,
            reject with notes to send back to the owner.
          </p>
        </div>

        <ModerationQueueClient initialItems={items} />
      </div>
    </div>
  );
}
