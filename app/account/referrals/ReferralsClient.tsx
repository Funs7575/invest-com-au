"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";
import Icon from "@/components/Icon";

interface ReferralStats {
  total_referred: number;
  converted: number;
  rewards_earned: number;
}

interface ReferralHistoryItem {
  id: number;
  date: string;
  status: string;
  email: string | null;
}

export default function ReferralsClient() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralUrl, setReferralUrl] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats>({ total_referred: 0, converted: 0, rewards_earned: 0 });
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const fetchReferralData = useCallback(async () => {
    try {
      const res = await fetch("/api/referrals");
      if (!res.ok) throw new Error("Failed to load referral data");
      const data = await res.json();
      setReferralCode(data.code);
      setReferralUrl(data.referral_url);
      setStats(data.stats);
      setHistory(data.history || []);
      setError(null);
    } catch {
      setError("Failed to load referral data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push("/auth/login?next=/account/referrals");
      return;
    }
    fetchReferralData();
  }, [user, userLoading, router, fetchReferralData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in input
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent("Join me on Invest.com.au — compare brokers smarter");
    const body = encodeURIComponent(
      `Hey,\n\nI've been using Invest.com.au to compare Australian brokers and find the best fees. If you sign up with my link, we both get 1 month of Pro free!\n\n${referralUrl}\n\nCheers`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join Invest.com.au",
          text: "Compare Australian brokers, find the best fees. Sign up and we both get 1 month Pro free!",
          url: referralUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } catch {
        // User cancelled share
      }
    }
  };

  if (userLoading || loading || !user) {
    return (
      <div className="py-16">
        <div className="container-custom max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="h-40 bg-slate-100 rounded-xl" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-2xl">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-500 mb-4">
          <Link href="/account" className="hover:text-slate-900">My Account</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Refer a Friend</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <Icon name="gift" size={20} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Invite friends, earn Pro free</h1>
              <p className="text-sm text-slate-600 mt-1">
                Share your unique referral link. When a friend signs up and creates an account,
                you both get <span className="font-semibold text-emerald-700">1 month of Investor Pro free</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
            <Icon name="check-circle" size={14} className="text-emerald-500" />
            <span>No limit on referrals</span>
            <span className="mx-1">|</span>
            <Icon name="check-circle" size={14} className="text-emerald-500" />
            <span>Both you and your friend benefit</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Referral Link */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Your Referral Link</h2>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Icon name={copied ? "check-circle" : "copy"} size={16} className="text-white" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Your code: <span className="font-mono font-semibold text-slate-600">{referralCode}</span>
          </p>
        </div>

        {/* Share Buttons */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Share via</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Icon name="copy" size={16} className="text-slate-500" />
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={handleEmailShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Icon name="mail" size={16} className="text-slate-500" />
              Email
            </button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button
                onClick={handleNativeShare}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Icon name="share-2" size={16} className="text-slate-500" />
                {shareSuccess ? "Shared!" : "Share"}
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Icon name="users" size={16} className="text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{stats.total_referred}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Invited</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Icon name="check-circle" size={16} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{stats.converted}</p>
            <p className="text-xs text-slate-500 mt-0.5">Signed Up</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Icon name="trophy" size={16} className="text-amber-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{stats.rewards_earned}</p>
            <p className="text-xs text-slate-500 mt-0.5">Rewards Earned</p>
          </div>
        </div>

        {/* Referral History */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <h2 className="text-base font-bold text-slate-900 mb-3">Referral History</h2>
          {history.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="users" size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No referrals yet. Share your link to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Referral</th>
                    <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50">
                      <td className="py-2.5 text-slate-700">
                        {item.email || `Referral #${item.id}`}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {new Date(item.date).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2.5">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-base font-bold text-slate-900 mb-3">How it works</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p className="text-sm text-slate-600">Share your unique referral link with friends interested in investing.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <p className="text-sm text-slate-600">Your friend signs up for a free account using your link.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <p className="text-sm text-slate-600">Both of you receive 1 month of Investor Pro free, including fee alerts, advanced tools, and ad-free browsing.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    converted: "bg-blue-100 text-blue-700",
    rewarded: "bg-emerald-100 text-emerald-700",
  };

  const labels: Record<string, string> = {
    pending: "Pending",
    converted: "Signed Up",
    rewarded: "Rewarded",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}
