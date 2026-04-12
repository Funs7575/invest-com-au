"use client";

import { useState, useEffect, useCallback } from "react";
import type { Broker } from "@/lib/types";
import BrokerLogo from "@/components/BrokerLogo";

interface CommunityVoteProps {
  brokerA: Broker;
  brokerB: Broker;
}

const LS_PREFIX = "inv_versus_vote_";

export default function CommunityVote({ brokerA, brokerB }: CommunityVoteProps) {
  const [voted, setVoted] = useState(false);
  const [chosenSlug, setChosenSlug] = useState<string | null>(null);
  const [percentA, setPercentA] = useState(50);
  const [percentB, setPercentB] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const pairKey = `${LS_PREFIX}${[brokerA.slug, brokerB.slug].sort().join("_")}`;

  // Check localStorage for prior vote and fetch results
  useEffect(() => {
    const stored = localStorage.getItem(pairKey);
    if (stored) {
      setVoted(true);
      setChosenSlug(stored);
    }

    // Fetch current results
    fetch(`/api/versus/vote?a=${encodeURIComponent(brokerA.slug)}&b=${encodeURIComponent(brokerB.slug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.total != null) {
          setPercentA(data.percent_a ?? 50);
          setPercentB(data.percent_b ?? 50);
          setTotal(data.total ?? 0);
        }
      })
      .catch(() => {});
  }, [brokerA.slug, brokerB.slug, pairKey]);

  const castVote = useCallback(
    async (chosenBroker: Broker) => {
      if (voted || loading) return;
      setLoading(true);

      try {
        const res = await fetch("/api/versus/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            broker_a_slug: brokerA.slug,
            broker_b_slug: brokerB.slug,
            chosen_slug: chosenBroker.slug,
          }),
        });

        if (res.ok || res.status === 409) {
          // 409 = already voted, still treat as success
          setVoted(true);
          setChosenSlug(chosenBroker.slug);
          localStorage.setItem(pairKey, chosenBroker.slug);

          // Optimistic update
          const newTotal = total + 1;
          setTotal(newTotal);
          const aVotes = (chosenBroker.slug === brokerA.slug ? percentA / 100 * total + 1 : percentA / 100 * total);
          const bVotes = newTotal - aVotes;
          setPercentA(newTotal > 0 ? Math.round((aVotes / newTotal) * 100) : 50);
          setPercentB(newTotal > 0 ? Math.round((bVotes / newTotal) * 100) : 50);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    },
    [voted, loading, brokerA.slug, brokerB.slug, pairKey, total, percentA]
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl md:rounded-2xl p-4 md:p-6">
      <h2 className="text-base md:text-xl font-extrabold text-slate-900 mb-1">
        Community Vote
      </h2>
      <p className="text-xs md:text-sm text-slate-500 mb-4">
        {voted
          ? `${total.toLocaleString()} vote${total !== 1 ? "s" : ""} so far`
          : "Which broker would you choose?"}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[brokerA, brokerB].map((broker) => {
          const isChosen = chosenSlug === broker.slug;
          const percent = broker.slug === brokerA.slug ? percentA : percentB;

          return (
            <button
              key={broker.slug}
              onClick={() => castVote(broker)}
              disabled={voted || loading}
              className={`relative rounded-xl border-2 p-4 md:p-5 text-center transition-all ${
                voted
                  ? isChosen
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-slate-200 bg-slate-50/50"
                  : "border-slate-200 hover:border-slate-400 hover:shadow-md cursor-pointer active:scale-[0.98]"
              } ${loading ? "opacity-60" : ""}`}
            >
              <BrokerLogo broker={broker} size="lg" className="mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-900">{broker.name}</p>
              {broker.rating && (
                <p className="text-xs text-slate-500 mt-0.5">{broker.rating}/5</p>
              )}

              {/* Vote result overlay */}
              {voted && (
                <div className="mt-3">
                  <p className="text-xl md:text-2xl font-extrabold" style={{ color: isChosen ? "#059669" : "#64748b" }}>
                    {percent}%
                  </p>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${percent}%`,
                        background: isChosen ? "#059669" : "#94a3b8",
                      }}
                    />
                  </div>
                </div>
              )}

              {isChosen && (
                <div className="absolute -top-2 -right-2">
                  <span className="px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider bg-emerald-500 text-white rounded-full">
                    Your pick
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {!voted && (
        <p className="text-[0.69rem] text-slate-400 text-center">
          Click a broker card to cast your vote. One vote per comparison.
        </p>
      )}
    </div>
  );
}
