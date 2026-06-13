"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import BidCoachPanel, { type BidCoachAnalytics } from "./BidCoachPanel";

const BUDGET_LABELS: Record<string, string> = {
  under_500: "Under $500", "500_2k": "$500–$2k", "2k_5k": "$2k–$5k",
  "5k_10k": "$5k–$10k", "10k_plus": "$10k+", not_sure: "Budget TBD",
};

type Auction = {
  id: number;
  lead_type: string;
  location: string | null;
  budget_range: string | null;
  status: string;
  ends_at: string;
  created_at: string;
  high_bid_cents: number | null;
  bid_count: number;
  my_bid_cents: number | null;
  my_bid_id: number | null;
  is_leading: boolean;
  /** Idea #11 — sealed: competing amounts hidden until close. */
  sealed?: boolean;
};

type WonAuction = {
  id: number;
  bid_amount: number;
  auction_id: number;
  advisor_auctions: {
    id: number;
    lead_id: number;
    lead_type: string;
    location: string | null;
    budget_range: string | null;
    status: string;
    ends_at: string;
  };
};

type PublicBid = {
  id: number;
  bid_amount: number;
  status: string;
  created_at: string;
  // Idea #11 — counter / round fields (fail-soft; absent when dormant).
  counter_status?: string | null;
  counter_amount?: number | null;
  round_number?: number | null;
  advisor_auctions: {
    id: number;
    slug: string;
    job_title: string;
    budget_band: string;
    location: string | null;
    status: string;
    ends_at: string;
    winning_bid_id: number | null;
  } | null;
};

function formatTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m remaining`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m remaining`;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdvisorAuctionsPage() {
  const [advisorId, setAdvisorId] = useState<number | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([]);
  const [publicBids, setPublicBids] = useState<PublicBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bidInputs, setBidInputs] = useState<Record<number, string>>({});
  const [bidLoading, setBidLoading] = useState<Record<number, boolean>>({});
  const [bidMessages, setBidMessages] = useState<Record<number, { type: "success" | "error"; text: string }>>({});
  const [retractingBid, setRetractingBid] = useState<number | null>(null);
  const [pendingRetractId, setPendingRetractId] = useState<number | null>(null);
  const [retractReason, setRetractReason] = useState("");
  const [coachAnalytics, setCoachAnalytics] = useState<BidCoachAnalytics | null>(null);
  // Idea #11 — counter-offer responses.
  const [counterRespondingId, setCounterRespondingId] = useState<number | null>(null);

  // Bid Coach data — fetched once on mount (slow-moving aggregates, no
  // need to ride the 30s auction refresh loop). Optional: failures are
  // silent and the coach simply doesn't render.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/advisor-portal/marketplace-analytics");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.total_bids === "number") {
          setCoachAnalytics(data as BidCoachAnalytics);
        }
      } catch {
        // Coach is supplementary — never block the auctions screen.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchAdvisor = useCallback(async () => {
    try {
      const res = await fetch("/api/advisor-portal/profile");
      if (!res.ok) return;
      const data = await res.json();
      if (data.advisor?.id) setAdvisorId(data.advisor.id);
    } catch {
      // Ignore
    }
  }, []);

  const fetchAuctions = useCallback(async () => {
    if (!advisorId) return;
    setLoading(true);
    try {
      const [auctionRes, publicBidsRes] = await Promise.all([
        fetch(`/api/advisor-auction?advisor_id=${advisorId}`),
        fetch("/api/advisor-auction/public-bids"),
      ]);

      if (!auctionRes.ok) {
        setError("Failed to load auctions.");
        return;
      }
      const data = await auctionRes.json();
      setAuctions(data.active || []);
      setWonAuctions(data.won || []);

      if (publicBidsRes.ok) {
        const pubData = await publicBidsRes.json();
        setPublicBids(pubData.bids || []);
      }
    } catch {
      setError("Failed to load auctions.");
    } finally {
      setLoading(false);
    }
  }, [advisorId]);

  async function handleRetractBid(bidId: number) {
    setPendingRetractId(null);
    const reason = retractReason;
    setRetractReason("");
    setRetractingBid(bidId);
    try {
      const params = new URLSearchParams({ bid_id: String(bidId) });
      if (reason && reason.trim()) params.set("reason", reason.trim());
      const res = await fetch(`/api/advisor-auction/public-bids?${params.toString()}`, { method: "DELETE" });
      if (res.ok) {
        setPublicBids((prev) =>
          prev.map((b) => (b.id === bidId ? { ...b, status: "retracted" } : b))
        );
      }
    } finally {
      setRetractingBid(null);
    }
  }

  // Idea #11 — accept or decline a pending counter-offer.
  async function handleCounterRespond(bidId: number, action: "accept" | "decline") {
    setCounterRespondingId(bidId);
    try {
      const res = await fetch("/api/advisor-portal/counter-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bid_id: bidId, action }),
      });
      if (res.ok) {
        setPublicBids((prev) =>
          prev.map((b) => {
            if (b.id !== bidId) return b;
            return action === "accept"
              ? { ...b, counter_status: "accepted", bid_amount: b.counter_amount ?? b.bid_amount }
              : { ...b, counter_status: "declined" };
          }),
        );
      }
    } finally {
      setCounterRespondingId(null);
    }
  }

  useEffect(() => {
    fetchAdvisor();
  }, [fetchAdvisor]);

  useEffect(() => {
    if (advisorId) {
      fetchAuctions();
      // Refresh every 30 seconds
      const interval = setInterval(fetchAuctions, 30000);
      return () => clearInterval(interval);
    }
  }, [advisorId, fetchAuctions]);

  async function handleBid(auctionId: number) {
    const amountStr = bidInputs[auctionId];
    const amountDollars = parseFloat(amountStr || "0");
    if (isNaN(amountDollars) || amountDollars < 50) {
      setBidMessages((prev) => ({
        ...prev,
        [auctionId]: { type: "error", text: "Minimum bid is $50.00" },
      }));
      return;
    }

    setBidLoading((prev) => ({ ...prev, [auctionId]: true }));
    setBidMessages((prev) => {
      const next = { ...prev };
      delete next[auctionId];
      return next;
    });

    try {
      const res = await fetch("/api/advisor-auction/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auction_id: auctionId,
          bid_amount: Math.round(amountDollars * 100),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBidMessages((prev) => ({
          ...prev,
          [auctionId]: { type: "error", text: data.error || "Failed to place bid." },
        }));
        return;
      }

      setBidMessages((prev) => ({
        ...prev,
        [auctionId]: { type: "success", text: data.message },
      }));

      // Refresh auctions after bid
      fetchAuctions();
    } catch {
      setBidMessages((prev) => ({
        ...prev,
        [auctionId]: { type: "error", text: "Network error. Try again." },
      }));
    } finally {
      setBidLoading((prev) => ({ ...prev, [auctionId]: false }));
    }
  }

  if (!advisorId && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="container-custom max-w-4xl">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <h1 className="text-xl font-extrabold text-slate-900 mb-2">
              Advisor Portal Required
            </h1>
            <p className="text-sm text-slate-600 mb-4">
              You need an advisor profile to access the lead auction system.
            </p>
            <Link
              href="/advisor-portal"
              className="inline-block px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Go to Advisor Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container-custom max-w-5xl py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/advisor-portal"
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Advisor Portal
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-sm font-medium text-slate-900">
                  Lead Auctions
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Lead Auctions
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Bid on high-quality leads matched to your specialties
              </p>
            </div>
            <button
              type="button"
              onClick={fetchAuctions}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Icon name="refresh-cw" size={14} className="inline mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="container-custom max-w-5xl py-8">
        {/* Framing disclosure — referral fee arrangement, not endorsement */}
        <p className="text-[0.65rem] text-slate-500 mb-5 leading-relaxed">
          Lead auctions are a paid referral service. Winning advisors pay a referral fee to access consumer contact details. Invest.com.au does not endorse, recommend, or accredit any advisor by virtue of their participation. {ADVERTISER_DISCLOSURE_SHORT}
        </p>

        {/* Grid only engages when the coach has data — otherwise the page
            keeps its original single-column layout. */}
        <div
          className={
            coachAnalytics
              ? "lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 lg:items-start"
              : ""
          }
        >
        {/* Bid coach sidebar — DOM-first so it tops the page on mobile,
            right column on desktop. Renders nothing until analytics load. */}
        {coachAnalytics && (
          <aside className="lg:order-2 mb-6 lg:mb-0 lg:sticky lg:top-6">
            <BidCoachPanel analytics={coachAnalytics} />
          </aside>
        )}
        <div className="lg:order-1 min-w-0">
        {/* Public consumer-job marketplace cross-link */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200 rounded-xl p-4 mb-6 flex items-start sm:items-center gap-4 flex-col sm:flex-row">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shrink-0">
            <Icon name="zap" size={18} className="text-slate-900" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-sm">Browse public quote requests</p>
            <p className="text-xs text-slate-700 mt-0.5">
              Consumers post jobs publicly on Invest.com.au — quote on them directly. Lower competition than internal lead auctions.
            </p>
          </div>
          <Link
            href="/quotes"
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap"
          >
            Open marketplace →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <>
            {/* Active Auctions */}
            <section className="mb-10">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                Active Auctions
                {auctions.length > 0 && (
                  <span className="ml-2 text-sm font-medium text-slate-500">
                    ({auctions.length})
                  </span>
                )}
              </h2>

              {auctions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-500">
                    No active auctions matching your profile right now. Check
                    back soon — new leads are auctioned throughout the day.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {auctions.map((auction) => (
                    <div
                      key={auction.id}
                      className="bg-white rounded-xl border border-slate-200 p-5"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900">
                              {auction.lead_type} Lead
                            </h3>
                            {auction.sealed && (
                              <span className="text-[0.65rem] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1">
                                <Icon name="lock" size={10} />
                                Sealed
                              </span>
                            )}
                            {!auction.sealed && auction.is_leading && (
                              <span className="text-[0.65rem] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                Leading
                              </span>
                            )}
                            {!auction.sealed && auction.my_bid_cents && !auction.is_leading && (
                              <span className="text-[0.65rem] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                Outbid
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                            {auction.location && (
                              <span>
                                <Icon
                                  name="map-pin"
                                  size={14}
                                  className="inline mr-1"
                                />
                                {auction.location}
                              </span>
                            )}
                            {auction.budget_range && (
                              <span>
                                <Icon
                                  name="dollar-sign"
                                  size={14}
                                  className="inline mr-1"
                                />
                                {auction.budget_range}
                              </span>
                            )}
                            <span>
                              <Icon
                                name="clock"
                                size={14}
                                className="inline mr-1"
                              />
                              {formatTimeRemaining(auction.ends_at)}
                            </span>
                            <span>
                              {auction.bid_count} bid
                              {auction.bid_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          {auction.sealed ? (
                            <>
                              <p className="text-xs text-slate-500 mb-1">Sealed request</p>
                              <p className="text-sm font-bold text-indigo-700 inline-flex items-center gap-1 justify-end">
                                <Icon name="lock" size={12} />
                                Competing bids hidden
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-slate-500 mb-1">
                                Current high bid
                              </p>
                              <p className="text-lg font-extrabold text-slate-900">
                                {auction.high_bid_cents
                                  ? formatCents(auction.high_bid_cents)
                                  : "No bids yet"}
                              </p>
                            </>
                          )}
                          {auction.my_bid_cents && (
                            <p className="text-xs text-slate-500 mt-1">
                              Your bid: {formatCents(auction.my_bid_cents)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bid Form */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-end gap-3">
                          <div className="flex-1 max-w-xs">
                            <label
                              htmlFor={`bid-${auction.id}`}
                              className="block text-xs font-medium text-slate-600 mb-1"
                            >
                              Your bid (AUD, min $50)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                                $
                              </span>
                              <input
                                id={`bid-${auction.id}`}
                                type="number" inputMode="decimal"
                                min={50}
                                step={5}
                                value={bidInputs[auction.id] || ""}
                                onChange={(e) =>
                                  setBidInputs((prev) => ({
                                    ...prev,
                                    [auction.id]: e.target.value,
                                  }))
                                }
                                placeholder="50.00"
                                className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleBid(auction.id)}
                            disabled={bidLoading[auction.id]}
                            className="px-5 py-2 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {bidLoading[auction.id]
                              ? "Bidding..."
                              : auction.my_bid_cents
                                ? "Update Bid"
                                : "Place Bid"}
                          </button>
                        </div>

                        {bidMessages[auction.id] && (
                          <p
                            className={`mt-2 text-sm ${
                              bidMessages[auction.id].type === "success"
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {bidMessages[auction.id].text}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Won Auctions */}
            <section>
              <h2 className="text-lg font-extrabold text-slate-900 mb-4">
                Won Leads
                {wonAuctions.length > 0 && (
                  <span className="ml-2 text-sm font-medium text-slate-500">
                    ({wonAuctions.length})
                  </span>
                )}
              </h2>

              {wonAuctions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-500">
                    No won leads yet. Winning bids reveal the lead&apos;s
                    contact details so you can reach out directly.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wonAuctions.map((won) => (
                    <div
                      key={won.id}
                      className="bg-white rounded-xl border border-emerald-200 p-5"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                              {won.advisor_auctions.lead_type} Lead
                            </h3>
                            <span className="text-[0.65rem] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
                              Won
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                            {won.advisor_auctions.location && (
                              <span>{won.advisor_auctions.location}</span>
                            )}
                            {won.advisor_auctions.budget_range && (
                              <span>{won.advisor_auctions.budget_range}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Winning bid</p>
                          <p className="text-lg font-extrabold text-emerald-600">
                            {formatCents(won.bid_amount)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-emerald-100">
                        <p className="text-sm text-slate-600">
                          Lead ID: #{won.advisor_auctions.lead_id} — Contact
                          details available in your{" "}
                          <Link
                            href="/advisor-portal"
                            className="text-emerald-600 font-medium underline"
                          >
                            lead inbox
                          </Link>
                          .
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Public Quote Requests — my bids */}
            <section className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    My Public Quote Bids
                    {publicBids.length > 0 && (
                      <span className="ml-2 text-sm font-medium text-slate-500">
                        ({publicBids.length})
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Quotes you&apos;ve submitted on the public marketplace.
                  </p>
                </div>
                <Link
                  href="/quotes"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs px-4 py-2 rounded-lg"
                >
                  Browse open jobs →
                </Link>
              </div>

              {publicBids.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-500">
                    You haven&apos;t bid on any public quote requests yet.{" "}
                    <Link href="/quotes" className="text-amber-600 font-medium underline">
                      Browse the marketplace
                    </Link>{" "}
                    to find matching jobs.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {publicBids.map((bid) => {
                    const job = bid.advisor_auctions;
                    const isWon = bid.status === "won";
                    const isLost = bid.status === "lost";
                    const isRetracted = bid.status === "retracted";
                    const isPending = bid.status === "active";
                    const jobExpired = job ? new Date(job.ends_at) < new Date() : false;
                    // Idea #11 — counter / final-round state for this bid.
                    const counterPending = bid.counter_status === "pending";
                    const counterAccepted = bid.counter_status === "accepted";
                    const isFinalRound = (bid.round_number ?? 1) >= 2;

                    return (
                      <div
                        key={bid.id}
                        className={`bg-white rounded-xl border p-5 ${
                          isWon ? "border-emerald-200" : isLost || isRetracted ? "border-slate-100 opacity-70" : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {job && (
                                <Link
                                  href={`/quotes/${job.slug}`}
                                  className="font-bold text-slate-900 hover:text-amber-700 transition-colors"
                                >
                                  {job.job_title}
                                </Link>
                              )}
                              <span
                                className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                  isWon
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isLost
                                    ? "bg-slate-100 text-slate-500"
                                    : isRetracted
                                    ? "bg-slate-100 text-slate-500"
                                    : jobExpired
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {isWon ? "Won" : isLost ? "Not selected" : isRetracted ? "Retracted" : jobExpired ? "Expired" : "Pending"}
                              </span>
                              {isFinalRound && (
                                <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                                  <Icon name="zap" size={10} /> Final round
                                </span>
                              )}
                              {counterAccepted && (
                                <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                                  <Icon name="check" size={10} /> Countered
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                              {job?.location && <span><Icon name="map-pin" size={12} className="inline mr-1" />{job.location}</span>}
                              {job?.budget_band && <span>{BUDGET_LABELS[job.budget_band] || job.budget_band}</span>}
                              {!jobExpired && job && <span><Icon name="clock" size={12} className="inline mr-1" />Closes {new Date(job.ends_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 mb-0.5">Your bid</p>
                            <p className={`text-lg font-extrabold ${isWon ? "text-emerald-600" : "text-slate-900"}`}>
                              ${(bid.bid_amount / 100).toFixed(0)}
                            </p>
                          </div>
                        </div>

                        {isWon && (
                          <div className="mt-3 pt-3 border-t border-emerald-100 text-sm text-emerald-800">
                            Your bid was accepted. Check your email for the client&apos;s contact details.
                          </div>
                        )}

                        {/* Idea #11 — pending counter-offer: accept or decline. */}
                        {counterPending && !jobExpired && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                              <p className="text-xs text-slate-700 mb-2">
                                <span className="font-semibold text-slate-900">Counter-offer:</span> the consumer asked whether you&apos;d do this for{" "}
                                <span className="font-bold text-emerald-700">${((bid.counter_amount ?? 0) / 100).toFixed(0)}</span>{" "}
                                (your quote: ${(bid.bid_amount / 100).toFixed(0)}). Your fee stays your own.
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCounterRespond(bid.id, "accept")}
                                  disabled={counterRespondingId === bid.id}
                                  className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                                >
                                  {counterRespondingId === bid.id ? "Saving…" : `Accept $${((bid.counter_amount ?? 0) / 100).toFixed(0)}`}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCounterRespond(bid.id, "decline")}
                                  disabled={counterRespondingId === bid.id}
                                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded border border-slate-200 transition-colors disabled:opacity-50"
                                >
                                  Keep my quote
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {isPending && !jobExpired && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3">
                            <Link
                              href={`/quotes/${job?.slug}`}
                              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                            >
                              <Icon name="external-link" size={12} />
                              View job
                            </Link>
                            {pendingRetractId === bid.id ? (
                              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-2">
                                <p className="font-medium text-red-800">Retract this bid?</p>
                                <select
                                  value={retractReason}
                                  onChange={(e) => setRetractReason(e.target.value)}
                                  className="w-full border border-red-200 rounded px-2 py-1 text-xs text-slate-700 bg-white"
                                >
                                  <option value="">Reason (optional)</option>
                                  <option value="schedule_conflict">Schedule conflict</option>
                                  <option value="already_booked">Already booked</option>
                                  <option value="outside_expertise">Outside my expertise</option>
                                  <option value="other">Other</option>
                                </select>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { void handleRetractBid(bid.id); }}
                                    disabled={retractingBid === bid.id}
                                    className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                  >{retractingBid === bid.id ? "Retracting…" : "Confirm retract"}</button>
                                  <button
                                    onClick={() => { setPendingRetractId(null); setRetractReason(""); }}
                                    className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200 transition-colors"
                                  >Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setPendingRetractId(bid.id)}
                                disabled={retractingBid === bid.id}
                                className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Icon name="x-circle" size={12} />
                                {retractingBid === bid.id ? "Retracting…" : "Retract bid"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}
