import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Reviews — My Account",
  robots: "noindex, nofollow",
};

type ReviewRow = {
  id: number;
  broker_slug: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  created_at: string | null;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-800" },
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          aria-hidden="true"
          className={`w-3.5 h-3.5 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default async function AccountReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/account/login?redirect=/account/reviews");
  }

  const admin = createAdminClient();
  const { data: reviews } = await admin
    .from("user_reviews")
    .select("id, broker_slug, rating, title, body, status, created_at")
    .eq("email", user.email)
    .order("created_at", { ascending: false });

  const rows = (reviews ?? []) as ReviewRow[];

  return (
    <div className="py-6 md:py-10">
      <div className="container-custom max-w-3xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/account" className="hover:text-slate-900">
            ← My account
          </Link>
        </nav>

        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">My Reviews</h1>
            <p className="text-sm text-slate-500 mt-1">
              Broker reviews you&rsquo;ve submitted on Invest.com.au.
            </p>
          </div>
          <Link
            href="/reviews/write"
            className="shrink-0 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Write a review
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                aria-hidden="true"
                className="w-6 h-6 text-amber-600 fill-amber-600"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">No reviews yet</h2>
            <p className="text-sm text-slate-500 mb-4">
              Share your broker experience and earn 1 month of Investor Pro free.
            </p>
            <Link
              href="/reviews/write"
              className="inline-block px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Write your first review
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((review) => {
              const badge = STATUS_BADGE[review.status] ?? STATUS_BADGE["pending"]!;
              const brokerLabel = review.broker_slug
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
              const date = review.created_at
                ? new Date(review.created_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "";
              return (
                <article
                  key={review.id}
                  className="bg-white border border-slate-200 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div>
                      <Link
                        href={`/broker/${review.broker_slug}`}
                        className="text-sm font-semibold text-emerald-700 hover:underline"
                      >
                        {brokerLabel}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRow rating={review.rating} />
                        <span className="text-xs text-slate-500">{review.rating}/5</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {date && <span className="text-xs text-slate-400">{date}</span>}
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{review.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-3">{review.body}</p>
                  {review.status === "approved" && (
                    <div className="mt-3">
                      <Link
                        href={`/broker/${review.broker_slug}#reviews`}
                        className="text-xs text-emerald-600 font-semibold hover:underline"
                      >
                        View live →
                      </Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-amber-700">Earn Investor Pro free:</span>{" "}
            Each approved review earns 1 month of Investor Pro at no cost. Reviews are
            moderated within 24–48 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
