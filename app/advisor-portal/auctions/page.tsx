"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bidInputs, setBidInputs] = useState<Record<number, string>>({});
  const [bidLoading, setBidLoading] = useState<Record<number, boolean>>({});
  const [bidMessages, setBidMessages] = useState<Record<number, { type: "success" | "error"; text: string }>>({});

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
      const res = await fetch(`/api/advisor-auction?advisor_id=${advisorId}`);
      if (!res.ok) {
        setError("Failed to load auctions.");
        return;
      }
      const data = await res.json();
      setAuctions(data.active || []);
      setWonAuctions(data.won || []);
    } catch {
      setError("Failed to load auctions.");
    } finally {
      setLoading(false);
    }
  }, [advisorId]);

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
        <div className="container-custom max-w-4xl py-6">
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

      <div className="container-custom max-w-4xl py-8">
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
                            {auction.is_leading && (
                              <span className="text-[0.65rem] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                Leading
                              </span>
                            )}
                            {auction.my_bid_cents && !auction.is_leading && (
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
                          <p className="text-xs text-slate-500 mb-1">
                            Current high bid
                          </p>
                          <p className="text-lg font-extrabold text-slate-900">
                            {auction.high_bid_cents
                              ? formatCents(auction.high_bid_cents)
                              : "No bids yet"}
                          </p>
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
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                $
                              </span>
                              <input
                                id={`bid-${auction.id}`}
                                type="number"
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
                                className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleBid(auction.id)}
                            disabled={bidLoading[auction.id]}
                            className="px-5 py-2 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
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
          </>
        )}
      </div>
    </div>
  );
}
