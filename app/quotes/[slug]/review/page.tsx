import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leave a Review — Invest.com.au",
  robots: { index: false, follow: false },
};

interface SearchParams {
  token?: string;
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

export default async function ReviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  if (!token) notFound();

  const supabase = await createClient();
  const { data: auction } = await supabase
    .from("advisor_auctions")
    .select("id, slug, job_title, contact_name, winning_bid_id")
    .eq("slug", slug)
    .eq("source", "public_job")
    .maybeSingle();

  if (!auction || !auction.winning_bid_id) notFound();

  const { data: bid } = await supabase
    .from("advisor_auction_bids")
    .select("advisor_id")
    .eq("id", auction.winning_bid_id)
    .maybeSingle();

  const { data: advisor } = bid
    ? await supabase
        .from("professionals")
        .select("name, slug, type")
        .eq("id", bid.advisor_id)
        .maybeSingle()
    : { data: null };

  if (!advisor) notFound();

  return (
    <section className="bg-slate-50 min-h-[70vh] py-14">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-amber-600 font-bold mb-1">Share your experience</p>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
            How was {advisor.name as string}?
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            Reviewing the engagement for <strong>{auction.job_title as string}</strong>. Your review will be visible
            on {advisor.name as string}&apos;s profile and helps other Australians find trustworthy advisors.
          </p>
          <ReviewForm
            slug={slug}
            token={token}
            advisorName={advisor.name as string}
            defaultDisplayName={(auction.contact_name as string | null) ?? ""}
          />
        </div>
      </div>
    </section>
  );
}
