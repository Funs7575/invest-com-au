"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

interface Member {
  id: string;
  role: string;
  displayName: string;
  joinedAt: string;
}

interface WatchlistItem {
  id: string;
  brokerId: number;
  notes: string | null;
  createdAt: string;
  broker: { name: string; slug: string; logo_url: string | null; rating: number | null; asx_fee: string | null } | null;
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  authorDisplayName: string;
  authorRole: string;
}

interface BenchmarkEntry {
  displayName: string;
  brokerSlugs: string[];
}

interface Props {
  clubId: string;
  clubName: string;
  memberLimit: number;
  myMembership: { id: string; role: string; displayName: string };
  members: Member[];
  watchlist: WatchlistItem[];
  initialMessages: Message[];
  benchmark: BenchmarkEntry[];
}

type Tab = "feed" | "watchlist" | "members" | "invite";

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ClubDetail({
  clubId,
  clubName,
  memberLimit,
  myMembership,
  members,
  watchlist,
  initialMessages,
  benchmark,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>(watchlist);
  const [addingBrokerId, setAddingBrokerId] = useState("");
  const [addingNotes, setAddingNotes] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(`/api/clubs/${clubId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: newMessage.trim() }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setSendError(j.error ?? "Could not send.");
        return;
      }
      const optimistic: Message = {
        id: `opt-${Date.now()}`,
        body: newMessage.trim(),
        createdAt: new Date().toISOString(),
        authorDisplayName: myMembership.displayName,
        authorRole: myMembership.role,
      };
      setMessages((prev) => [...prev, optimistic]);
      setNewMessage("");
    } catch {
      setSendError("Could not send. Try again.");
    } finally {
      setSending(false);
    }
  }, [clubId, newMessage, myMembership]);

  const generateInvite = useCallback(async () => {
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/invite`, { method: "POST" });
      const j = (await res.json()) as { token?: string; error?: string };
      if (res.ok && j.token) setInviteToken(j.token);
    } catch {
      // silently ignore
    } finally {
      setInviteLoading(false);
    }
  }, [clubId]);

  const addToWatchlist = useCallback(async () => {
    const brokerId = parseInt(addingBrokerId, 10);
    if (!brokerId || isNaN(brokerId)) {
      setAddError("Enter a valid broker ID.");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch(`/api/clubs/${clubId}/watchlist`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brokerId, notes: addingNotes.trim() || null }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setAddError(j.error ?? "Could not add.");
        return;
      }
      const bId = parseInt(addingBrokerId, 10);
      setWatchlistItems((prev) => [
        { id: `opt-${Date.now()}`, brokerId: bId, notes: addingNotes.trim() || null, createdAt: new Date().toISOString(), broker: null },
        ...prev,
      ]);
      setAddingBrokerId("");
      setAddingNotes("");
    } catch {
      setAddError("Could not add. Try again.");
    } finally {
      setAdding(false);
    }
  }, [clubId, addingBrokerId, addingNotes]);

  const inviteUrl = inviteToken
    ? `${typeof window !== "undefined" ? window.location.origin : "https://invest.com.au"}/clubs/${clubId}/join?token=${inviteToken}`
    : null;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1 mb-4" role="tablist">
        {(["feed", "watchlist", "members", "invite"] as Tab[]).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "feed" ? "Discussion" : tab}
          </button>
        ))}
      </div>

      {/* Discussion tab */}
      {activeTab === "feed" && (
        <div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
            {messages.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No messages yet. Say hello!</p>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {messages.map((msg) => (
                  <div key={msg.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700">{msg.authorDisplayName}</span>
                      {msg.authorRole === "owner" && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Owner</span>
                      )}
                      <span className="text-[11px] text-slate-500">{timeAgo(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">{msg.body}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
              placeholder="Share a thought… (Enter to send)"
              maxLength={2000}
              rows={2}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={sending || !newMessage.trim()}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50 self-end"
            >
              Send
            </button>
          </div>
          {sendError && <p className="text-red-600 text-xs mt-1">{sendError}</p>}

          {/* Anonymised benchmark */}
          {benchmark.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Member watchlists (anonymised)</h3>
              <p className="text-xs text-slate-500 mb-3">General information only — not personal advice or recommendations.</p>
              <div className="space-y-2">
                {benchmark.map((entry, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs font-semibold text-slate-600">{entry.displayName}</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {entry.brokerSlugs.slice(0, 5).map((slug) => (
                        <Link key={slug} href={`/broker/${slug}`} className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full hover:bg-blue-200 transition-colors">
                          {slug}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Watchlist tab */}
      {activeTab === "watchlist" && (
        <div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
            {watchlistItems.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Nothing on the watchlist yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {watchlistItems.map((item) => (
                  <li key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      {item.broker ? (
                        <Link href={`/broker/${item.broker.slug}`} className="font-semibold text-sm text-blue-700 hover:underline">
                          {item.broker.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-sm text-slate-700">Broker #{item.brokerId}</span>
                      )}
                      {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
                    </div>
                    {item.broker?.asx_fee && (
                      <span className="text-xs text-slate-500 shrink-0">{item.broker.asx_fee}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Add to watchlist</p>
            <input
              type="number"
              value={addingBrokerId}
              onChange={(e) => setAddingBrokerId(e.target.value)}
              placeholder="Broker ID"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={addingNotes}
              onChange={(e) => setAddingNotes(e.target.value)}
              placeholder="Notes (optional)"
              maxLength={300}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            {addError && <p className="text-red-600 text-xs">{addError}</p>}
            <button
              onClick={() => void addToWatchlist()}
              disabled={adding}
              className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            General information only. Not a recommendation to buy or hold any product.
          </p>
        </div>
      )}

      {/* Members tab */}
      {activeTab === "members" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-100 text-xs text-slate-500">
            {members.length}/{memberLimit} members · anonymised display names
          </div>
          <ul className="divide-y divide-slate-100">
            {members.map((member) => (
              <li key={member.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{member.displayName}</p>
                  <p className="text-[11px] text-slate-500">Joined {new Date(member.joinedAt).toLocaleDateString("en-AU", { month: "short", day: "numeric" })}</p>
                </div>
                {member.role === "owner" && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Owner</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invite tab */}
      {activeTab === "invite" && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-700 mb-3">
            Share an invite link — it&apos;s valid for 7 days and can only be used once.
          </p>
          {inviteUrl ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 bg-slate-50"
                />
                <button
                  onClick={() => void navigator.clipboard.writeText(inviteUrl)}
                  className="px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                The person joining will choose their own display name.
              </p>
            </div>
          ) : (
            <button
              onClick={() => void generateInvite()}
              disabled={inviteLoading}
              className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50"
            >
              {inviteLoading ? "Generating…" : "Generate invite link"}
            </button>
          )}
          <p className="text-xs text-slate-500 mt-4">
            {clubName} has {members.length}/{memberLimit} members.
          </p>
        </div>
      )}
    </div>
  );
}
