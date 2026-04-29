"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface BidAdvisor {
  id: number;
  slug: string;
  name: string;
  firm_name: string | null;
  type: string;
  photo_url: string | null;
  rating: number | null;
  review_count: number | null;
  location_display: string | null;
  verified: boolean;
}

interface Bid {
  id: number;
  bid_amount: number;
  status: string;
  created_at: string;
  advisor: BidAdvisor | null;
}

interface Props {
  slug: string;
  jobStatus: string;
  winningBidId: number | null;
  isExpired: boolean;
  bids: Bid[];
  /** When the consumer clicks the email link from their confirmation email,
   *  ?email=... is in the URL — pre-fill the verification field. */
  ownerEmailFromUrl: string;
}

function formatBid(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

export default function QuoteBidsClient({ slug, jobStatus, winningBidId, isExpired, bids, ownerEmailFromUrl }: Props) {
  const [email, setEmail] = useState(ownerEmailFromUrl);
  const [pendingBidId, setPendingBidId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedBidId, setAcceptedBidId] = useState<number | null>(winningBidId);

  const isAwarded = jobStatus === "awarded" || acceptedBidId !== null;

  async function accept(bidId: number) {
    if (!email.trim()) {
      setError("Enter the email you used when posting.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${slug}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bid_id: bidId, contact_email: email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to accept bid.");
      setAcceptedBidId(bidId);
      setPendingBidId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (bids.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
        <Icon name="clock" size={24} className="text-slate-400 mx-auto mb-2" />
        <p className="font-bold text-slate-900 mb-1">No quotes yet</p>
        <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
          Verified advisors are being notified now. Most requests get their first quote within a few hours — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900">
          Quotes received <span className="text-slate-400 font-normal">({bids.length})</span>
        </h2>
        {isAwarded && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            <Icon name="check-circle" size={12} className="inline mr-1" />
            Awarded
          </span>
        )}
      </div>

      {/* Owner verification — only shown when consumer wants to accept */}
      {!isAwarded && !isExpired && pendingBidId !== null && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-slate-900 mb-2">Verify it&apos;s you</p>
          <p className="text-xs text-slate-600 mb-3">
            Enter the email you used when posting this request to confirm you&apos;re the owner.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={() => accept(pendingBidId)}
              disabled={loading || !email.trim()}
              className="inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-bold px-5 py-2 rounded-lg text-sm whitespace-nowrap"
            >
              {loading ? "Accepting..." : "Confirm & accept"}
              <Icon name="check" size={14} />
            </button>
            <button
              type="button"
              onClick={() => { setPendingBidId(null); setError(null); }}
              className="text-xs text-slate-500 hover:text-slate-700 px-3"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}

      <div className="space-y-3">
        {bids.map((bid) => {
          const isWinner = acceptedBidId === bid.id;
          const isLost = isAwarded && !isWinner;
          return (
            <div
              key={bid.id}
              className={`border rounded-xl p-4 transition-all ${
                isWinner
                  ? "border-emerald-300 bg-emerald-50/40"
                  : isLost
                    ? "border-slate-200 bg-slate-50 opacity-60"
                    : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Advisor avatar */}
                <div className="shrink-0">
                  {bid.advisor?.photo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={bid.advisor.photo_url}
                      alt={bid.advisor.name}
                      className="w-14 h-14 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                      <Icon name="user" size={20} className="text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Advisor + bid details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {bid.advisor?.slug ? (
                          <Link href={`/advisor/${bid.advisor.slug}`} className="hover:text-amber-700 hover:underline truncate">
                            {bid.advisor?.name || "Advisor"}
                          </Link>
                        ) : (
                          <span className="truncate">{bid.advisor?.name || "Advisor"}</span>
                        )}
                        {bid.advisor?.verified && (
                          <Icon name="badge-check" size={14} className="text-emerald-600 shrink-0" aria-label="Verified" />
                        )}
                      </p>
                      {bid.advisor?.firm_name && (
                        <p className="text-xs text-slate-500 truncate">{bid.advisor.firm_name}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="capitalize">{bid.advisor?.type?.replace(/_/g, " ")}</span>
                        {bid.advisor?.location_display && (
                          <>
                            <span>·</span>
                            <span>{bid.advisor.location_display}</span>
                          </>
                        )}
                        {(bid.advisor?.review_count ?? 0) > 0 && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Icon name="star" size={11} className="text-amber-500" />
                              {bid.advisor?.rating?.toFixed(1)} ({bid.advisor?.review_count})
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-extrabold text-slate-900">{formatBid(bid.bid_amount)}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">Bid</p>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-end gap-2 mt-3">
                    {isWinner ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <Icon name="check-circle" size={14} />
                        Accepted — advisor will be in touch
                      </span>
                    ) : isLost ? (
                      <span className="text-xs text-slate-400">Not selected</span>
                    ) : isExpired ? (
                      <span className="text-xs text-slate-400">Quote period closed</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setPendingBidId(bid.id); setError(null); }}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg"
                      >
                        Accept this quote
                        <Icon name="check" size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
