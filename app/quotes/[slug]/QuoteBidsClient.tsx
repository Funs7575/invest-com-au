"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import FeePercentileChip from "@/components/quotes/FeePercentileChip";
import type { FeePercentileInfo } from "@/lib/fee-benchmark";

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

interface BidCounter {
  status: string;
  amount: number | null;
}

interface Bid {
  id: number;
  bid_amount: number;
  status: string;
  created_at: string;
  advisor: BidAdvisor | null;
  /** Idea #11 — this bid was revised in (or invited to) the best-and-final round. */
  isFinalRound?: boolean;
  /** Idea #11 — an accepted counter updated this bid's amount. */
  wasCountered?: boolean;
  /** Idea #11 — the latest counter on this bid (pending/accepted/declined), if any. */
  counter?: BidCounter | null;
}

interface Props {
  slug: string;
  jobStatus: string;
  winningBidId: number | null;
  isExpired: boolean;
  bids: Bid[];
  /** Fee-benchmark percentile context per bid id — absent when the
   *  matching benchmark cell didn't meet the minimum sample. */
  feeContext?: Record<number, FeePercentileInfo>;
  /** When the consumer clicks the email link from their confirmation email,
   *  ?email=... is in the URL — pre-fill the verification field. */
  ownerEmailFromUrl: string;
  /** Idea #11 — sealed: hide bid amounts (and chips) from this viewer until close. */
  hideBidAmounts?: boolean;
  /** Idea #11 — viewer is the verified owner (consumer); unlocks counter / final round. */
  isOwner?: boolean;
  /** Idea #11 — the auction_rounds flag is on for this auction. */
  roundsEnabled?: boolean;
  /** Idea #11 — a best-and-final round is currently live. */
  finalRoundLive?: boolean;
  /** Idea #11 — when the live final round ends (ISO). */
  finalRoundEndsAt?: string | null;
  /** Idea #11 — a final round has already been started (one only). */
  finalRoundStarted?: boolean;
}

function formatBid(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

export default function QuoteBidsClient({
  slug, jobStatus, winningBidId, isExpired, bids, feeContext = {}, ownerEmailFromUrl,
  hideBidAmounts = false, isOwner = false, roundsEnabled = false,
  finalRoundLive = false, finalRoundEndsAt = null, finalRoundStarted = false,
}: Props) {
  const [email, setEmail] = useState(ownerEmailFromUrl);
  const [pendingBidId, setPendingBidId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedBidId, setAcceptedBidId] = useState<number | null>(winningBidId);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // Idea #11 — counter-offer + best-and-final round local state.
  const [counterBidId, setCounterBidId] = useState<number | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterDone, setCounterDone] = useState<Set<number>>(new Set());
  const [finalRoundIds, setFinalRoundIds] = useState<number[]>([]);
  const [finalRoundOpening, setFinalRoundOpening] = useState(false);
  const [finalRoundStartedLocal, setFinalRoundStartedLocal] = useState(finalRoundStarted);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAwarded = jobStatus === "awarded" || acceptedBidId !== null;
  // Owner-only controls (counter, final round) only when the flag is on, the
  // viewer is the verified owner, and the auction is still live.
  const ownerControls = roundsEnabled && isOwner && !isAwarded && !isExpired;

  function toggleCompare(bidId: number) {
    setCompareIds((curr) => {
      if (curr.includes(bidId)) return curr.filter((id) => id !== bidId);
      if (curr.length >= 3) return curr;
      return [...curr, bidId];
    });
  }
  const compareBids = bids.filter((b) => compareIds.includes(b.id));

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

  // Idea #11 — submit a counter-offer on a single bid.
  async function submitCounter(bidId: number) {
    if (!email.trim()) {
      setActionMsg({ type: "error", text: "Enter the email you used when posting." });
      return;
    }
    const dollars = parseFloat(counterAmount || "0");
    if (isNaN(dollars) || dollars < 50) {
      setActionMsg({ type: "error", text: "Counter must be at least $50." });
      return;
    }
    setLoading(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/quotes/${slug}/counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_email: email,
          bid_id: bidId,
          counter_amount: Math.round(dollars * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send counter.");
      setCounterDone((prev) => new Set(prev).add(bidId));
      setCounterBidId(null);
      setCounterAmount("");
      setActionMsg({ type: "success", text: "Counter sent — the adviser will accept or decline." });
    } catch (err) {
      setActionMsg({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  // Idea #11 — open a 24h best-and-final round among up to 3 chosen bids.
  function toggleFinalRound(bidId: number) {
    setFinalRoundIds((curr) => {
      if (curr.includes(bidId)) return curr.filter((id) => id !== bidId);
      if (curr.length >= 3) return curr;
      return [...curr, bidId];
    });
  }

  async function startFinalRound() {
    if (!email.trim()) {
      setActionMsg({ type: "error", text: "Enter the email you used when posting." });
      return;
    }
    if (finalRoundIds.length === 0) {
      setActionMsg({ type: "error", text: "Pick at least one quote for the final round." });
      return;
    }
    setFinalRoundOpening(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/quotes/${slug}/final-round`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_email: email, bid_ids: finalRoundIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start the final round.");
      setFinalRoundStartedLocal(true);
      setFinalRoundIds([]);
      setActionMsg({
        type: "success",
        text: `Final round opened — ${data.invited} adviser${data.invited === 1 ? "" : "s"} invited to submit one revised quote.`,
      });
    } catch (err) {
      setActionMsg({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setFinalRoundOpening(false);
    }
  }

  if (bids.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
        <Icon name="clock" size={24} className="text-slate-500 mx-auto mb-2" />
        <p className="font-bold text-slate-900 mb-1">No quotes yet</p>
        <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
          Verified advisors are being notified now. Most requests get their first quote within a few hours — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-bold text-slate-900">
          Quotes received <span className="text-slate-500 font-normal">({bids.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          {compareIds.length > 0 && !isAwarded && (
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
            >
              <Icon name="layout-grid" size={12} />
              Compare {compareIds.length}
            </button>
          )}
          {isAwarded && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <Icon name="check-circle" size={12} className="inline mr-1" />
              Awarded
            </span>
          )}
        </div>
      </div>

      {/* Idea #11 — sealed notice for NON-owners (explains hidden amounts). */}
      {hideBidAmounts && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 flex items-start gap-2">
          <Icon name="lock" size={14} className="text-indigo-600 mt-0.5 shrink-0" />
          <p className="text-xs text-indigo-900 leading-relaxed">
            <strong>Sealed request.</strong> Quote amounts are hidden until this request closes. {bids.length} {bids.length === 1 ? "adviser has" : "advisers have"} quoted so far.
          </p>
        </div>
      )}

      {/* Idea #11 — action message (counter / final round). */}
      {actionMsg && (
        <p
          role="status"
          className={`text-xs mb-4 rounded-lg px-3 py-2 ${
            actionMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {actionMsg.text}
        </p>
      )}

      {/* Idea #11 — best-and-final round control bar (owner only, one round). */}
      {ownerControls && bids.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          {finalRoundLive ? (
            <p className="text-xs text-amber-900 leading-relaxed flex items-start gap-2">
              <Icon name="zap" size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <span>
                <strong>Best-and-final round live.</strong> Invited advisers can submit one revised quote
                {finalRoundEndsAt ? ` until ${new Date(finalRoundEndsAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}. Revised quotes are marked below.
              </span>
            </p>
          ) : finalRoundStartedLocal ? (
            <p className="text-xs text-amber-900 leading-relaxed flex items-start gap-2">
              <Icon name="check" size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <span>You&apos;ve already run a best-and-final round on this request.</span>
            </p>
          ) : (
            <div>
              <p className="text-xs font-semibold text-amber-900 mb-1 flex items-center gap-1.5">
                <Icon name="zap" size={13} className="text-amber-600" />
                Run a best-and-final round
              </p>
              <p className="text-[0.7rem] text-amber-800 leading-relaxed mb-2">
                Tick up to three quotes below, then open a single 24-hour round. Those advisers get one chance to submit a revised quote. You can only do this once.
              </p>
              <button
                type="button"
                onClick={startFinalRound}
                disabled={finalRoundOpening || finalRoundIds.length === 0}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-bold text-xs px-4 py-2 rounded-lg"
              >
                {finalRoundOpening ? "Opening…" : `Open final round${finalRoundIds.length > 0 ? ` (${finalRoundIds.length})` : ""}`}
                <Icon name="arrow-right" size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Owner verification — only shown when consumer wants to accept */}
      {!isAwarded && !isExpired && pendingBidId !== null && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-slate-900 mb-2">Verify it&apos;s you</p>
          <p className="text-xs text-slate-600 mb-3">
            Enter the email you used when posting this request to confirm you&apos;re the owner.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
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
          {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}

      {/* Compare drawer */}
      {showCompare && compareBids.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="compare-bids-title" onKeyDown={(e) => { if (e.key === "Escape") setShowCompare(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 id="compare-bids-title" className="font-bold text-slate-900">Side-by-side comparison</h3>
              <button onClick={() => setShowCompare(false)} aria-label="Close comparison" className="text-slate-500 hover:text-slate-900">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {compareBids.map((b) => {
                const compareFee = feeContext[b.id];
                return (
                <div key={b.id} className="border border-slate-200 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    {b.advisor?.photo_url ? (
                      <Image src={b.advisor.photo_url} alt={b.advisor.name} width={40} height={40} className="rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><Icon name="user" size={16} className="text-slate-500" /></div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{b.advisor?.name ?? "Advisor"}</p>
                      {b.advisor?.firm_name && <p className="text-xs text-slate-500 truncate">{b.advisor.firm_name}</p>}
                    </div>
                  </div>
                  {hideBidAmounts ? (
                    <p className="text-base font-bold text-indigo-700 inline-flex items-center gap-1">
                      <Icon name="lock" size={13} /> Sealed
                    </p>
                  ) : (
                    <p className="text-2xl font-extrabold text-slate-900">{formatBid(b.bid_amount)}</p>
                  )}
                  {compareFee && !hideBidAmounts && <FeePercentileChip info={compareFee} />}
                  <dl className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="text-slate-800 capitalize">{b.advisor?.type?.replace(/_/g, " ") ?? "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Rating</dt><dd className="text-slate-800">{(b.advisor?.review_count ?? 0) > 0 ? `${b.advisor?.rating?.toFixed(1)} (${b.advisor?.review_count})` : "No reviews"}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Location</dt><dd className="text-slate-800 truncate">{b.advisor?.location_display ?? "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Verified</dt><dd className="text-slate-800">{b.advisor?.verified ? "Yes" : "No"}</dd></div>
                  </dl>
                  <div className="mt-auto pt-4 flex flex-col gap-2">
                    {b.advisor?.slug && (
                      <Link href={`/advisor/${b.advisor.slug}`} className="text-xs text-center text-slate-700 hover:text-slate-900 underline">
                        View full profile
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => { setShowCompare(false); setPendingBidId(b.id); setError(null); }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg"
                    >
                      Accept this quote
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {bids.map((bid) => {
          const isWinner = acceptedBidId === bid.id;
          const isLost = isAwarded && !isWinner;
          const fee = feeContext[bid.id];
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
                    <Image
                      src={bid.advisor.photo_url}
                      alt={bid.advisor.name}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                      <Icon name="user" size={20} className="text-slate-500" />
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
                      {hideBidAmounts ? (
                        <p className="text-sm font-bold text-indigo-700 inline-flex items-center gap-1">
                          <Icon name="lock" size={12} />
                          Sealed
                        </p>
                      ) : (
                        <>
                          <p className="text-xl font-extrabold text-slate-900">{formatBid(bid.bid_amount)}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Quote</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Idea #11 — round / counter badges. */}
                  {(bid.isFinalRound || bid.wasCountered || bid.counter?.status === "pending") && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {bid.isFinalRound && (
                        <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          <Icon name="zap" size={10} />
                          Final round
                        </span>
                      )}
                      {bid.wasCountered && (
                        <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          <Icon name="check" size={10} />
                          Countered
                        </span>
                      )}
                      {!bid.wasCountered && bid.counter?.status === "pending" && (
                        <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          <Icon name="clock" size={10} />
                          Counter pending
                        </span>
                      )}
                    </div>
                  )}

                  {/* Price context — factual percentile vs the marketplace benchmark */}
                  {fee && !hideBidAmounts && <FeePercentileChip info={fee} />}

                  {/* Action row */}
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <div className="flex items-center gap-3">
                      {!isAwarded && !isExpired ? (
                        <label className="text-xs text-slate-600 flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={compareIds.includes(bid.id)}
                            onChange={() => toggleCompare(bid.id)}
                            disabled={!compareIds.includes(bid.id) && compareIds.length >= 3}
                            className="accent-slate-900"
                          />
                          Compare
                        </label>
                      ) : (
                        <span />
                      )}
                      {/* Idea #11 — pick this quote for the best-and-final round. */}
                      {ownerControls && !finalRoundLive && !finalRoundStartedLocal && bid.status === "active" && (
                        <label className="text-xs text-amber-800 flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={finalRoundIds.includes(bid.id)}
                            onChange={() => toggleFinalRound(bid.id)}
                            disabled={!finalRoundIds.includes(bid.id) && finalRoundIds.length >= 3}
                            className="accent-amber-500"
                          />
                          Final round
                        </label>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                    {/* Idea #11 — counter this quote (owner only, active bid). */}
                    {ownerControls && bid.status === "active" && !counterDone.has(bid.id) && bid.counter?.status !== "pending" && (
                      <button
                        type="button"
                        onClick={() => { setCounterBidId(counterBidId === bid.id ? null : bid.id); setCounterAmount(""); setActionMsg(null); }}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold text-xs px-2.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300"
                      >
                        <Icon name="message-circle" size={12} />
                        Counter
                      </button>
                    )}
                    {isWinner ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <Icon name="check-circle" size={14} />
                        Accepted — advisor will be in touch
                      </span>
                    ) : isLost ? (
                      <span className="text-xs text-slate-500">Not selected</span>
                    ) : isExpired ? (
                      <span className="text-xs text-slate-500">Quote period closed</span>
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

                  {/* Idea #11 — inline counter-offer form. */}
                  {ownerControls && counterBidId === bid.id && (
                    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-slate-800 mb-1">Ask {bid.advisor?.name?.split(" ")[0] ?? "this adviser"}: would you do it for…?</p>
                      <p className="text-[0.7rem] text-slate-500 mb-2">A factual price question — they accept or decline. Their fee stays their own.</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1 max-w-[160px]">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                          <input
                            type="number" inputMode="decimal" min={50} step={10}
                            value={counterAmount}
                            onChange={(e) => setCounterAmount(e.target.value)}
                            placeholder="2,200"
                            className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => submitCounter(bid.id)}
                          disabled={loading || !counterAmount.trim() || !email.trim()}
                          className="inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap"
                        >
                          {loading ? "Sending…" : "Send counter"}
                        </button>
                        <button type="button" onClick={() => { setCounterBidId(null); setCounterAmount(""); }} className="text-xs text-slate-500 hover:text-slate-700 px-2">Cancel</button>
                      </div>
                      {!email.trim() && (
                        <p className="text-[0.7rem] text-slate-500 mt-2">Enter your posting email above (via Accept) to verify it&apos;s you.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
