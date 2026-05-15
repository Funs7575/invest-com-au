import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  listListingsForOwner,
  LISTING_KIND_LABELS,
  LISTING_STATUS_LABELS,
  type Listing,
} from "@/lib/listings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Listings — My Account",
  robots: "noindex, nofollow",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-500",
};

function formatPrice(listing: Listing): string {
  if (listing.askingPriceCents === null) return "Price on request";
  const aud = listing.askingPriceCents / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: listing.currency || "AUD",
    maximumFractionDigits: 0,
  }).format(aud);
}

export default async function AccountListingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const justSubmitted = sp.submitted === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/account/listings");
  }

  const listings = await listListingsForOwner(user.id);

  return (
    <div className="py-6 md:py-10">
      <div className="container-custom max-w-4xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/account" className="hover:text-slate-900">
            ← My account
          </Link>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              My listings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track the status of your owner-submitted opportunities.
            </p>
          </div>
          <Link
            href="/listings/new"
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm"
          >
            + Post a listing
          </Link>
        </div>

        {justSubmitted && (
          <p className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-3">
            Listing submitted for review. You&rsquo;ll hear back from us — usually within a business day.
          </p>
        )}

        {listings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
            You haven&rsquo;t posted any listings yet.{" "}
            <Link
              href="/listings/new"
              className="text-amber-600 font-semibold hover:underline"
            >
              Start your first listing
            </Link>
            .
          </div>
        ) : (
          <ul className="space-y-3">
            {listings.map((l) => (
              <li
                key={l.id}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                      {LISTING_KIND_LABELS[l.kind]}
                    </p>
                    <h2 className="text-base font-extrabold text-slate-900 break-words">
                      {l.status === "approved" ? (
                        <Link
                          href={`/listings/${l.slug}`}
                          className="hover:text-amber-700"
                        >
                          {l.title}
                        </Link>
                      ) : (
                        l.title
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {l.locationState || "Australia-wide"} · {formatPrice(l)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      STATUS_BADGE_CLASSES[l.status] ||
                      "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {LISTING_STATUS_LABELS[l.status]}
                  </span>
                </div>
                {l.moderationNotes && l.status === "rejected" && (
                  <p className="mt-2 text-xs bg-red-50 border border-red-100 text-red-700 rounded px-2 py-1">
                    Moderation notes: {l.moderationNotes}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-slate-500 mt-2">
                  <span>{l.viewCount} views</span>
                  <span>{l.matchRequestCount} match requests</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
