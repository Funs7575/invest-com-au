"use client";

import Link from "next/link";

interface PendingItems {
  articles: number;
  reviews: number;
  switchStories: number;
  disputes: number;
  applications: number;
  feeChanges: number;
  pendingAdvisors: number;
  pendingAdvisorReviews: number;
  articlesList: { id: number; title: string; author_name: string }[];
}

interface Props {
  pendingItems: PendingItems;
}

export default function AdminPendingActions({ pendingItems }: Props) {
  const total = pendingItems.articles + pendingItems.reviews + pendingItems.switchStories + pendingItems.disputes + pendingItems.applications + pendingItems.feeChanges + pendingItems.pendingAdvisors + pendingItems.pendingAdvisorReviews;
  if (total === 0) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-violet-50 to-white border border-violet-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📋</span>
        <h2 className="text-sm font-bold text-slate-900">Pending Actions</h2>
        <span className="text-[0.56rem] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">
          {total} items
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {pendingItems.pendingAdvisors > 0 && (
          <Link href="/admin/advisor-moderation" className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-200 hover:border-blue-300 hover:shadow-sm transition-all bg-blue-50/50">
            <span className="text-lg">👤</span>
            <div>
              <div className="text-xs font-bold text-blue-800">{pendingItems.pendingAdvisors} Advisor{pendingItems.pendingAdvisors !== 1 ? "s" : ""}</div>
              <div className="text-[0.56rem] text-blue-500">to approve</div>
            </div>
          </Link>
        )}
        {pendingItems.pendingAdvisorReviews > 0 && (
          <Link href="/admin/review-moderation" className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all bg-amber-50/50">
            <span className="text-lg">⭐</span>
            <div>
              <div className="text-xs font-bold text-amber-800">{pendingItems.pendingAdvisorReviews} Advisor Review{pendingItems.pendingAdvisorReviews !== 1 ? "s" : ""}</div>
              <div className="text-[0.56rem] text-amber-600">to moderate</div>
            </div>
          </Link>
        )}
        {pendingItems.articles > 0 && (
          <Link href="/admin/advisor-articles" className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 hover:border-violet-300 hover:shadow-sm transition-all">
            <span className="text-lg">📰</span>
            <div>
              <div className="text-xs font-bold text-slate-900">{pendingItems.articles} Article{pendingItems.articles !== 1 ? "s" : ""}</div>
              <div className="text-[0.56rem] text-slate-500">to review</div>
            </div>
          </Link>
        )}
        {pendingItems.reviews > 0 && (
          <Link href="/admin/user-reviews" className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 hover:border-violet-300 hover:shadow-sm transition-all">
            <span className="text-lg">⭐</span>
            <div>
              <div className="text-xs font-bold text-slate-900">{pendingItems.reviews} Review{pendingItems.reviews !== 1 ? "s" : ""}</div>
              <div className="text-[0.56rem] text-slate-500">to moderate</div>
            </div>
          </Link>
        )}
        {pendingItems.switchStories > 0 && (
          <Link href="/admin/switch-stories" className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 hover:border-violet-300 hover:shadow-sm transition-all">
            <span className="text-lg">🔄</span>
            <div>
              <div className="text-xs font-bold text-slate-900">{pendingItems.switchStories} Stor{pendingItems.switchStories !== 1 ? "ies" : "y"}</div>
              <div className="text-[0.56rem] text-slate-500">to moderate</div>
            </div>
          </Link>
        )}
        {pendingItems.disputes > 0 && (
          <Link href="/admin/advisors" className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-red-200 hover:border-red-300 hover:shadow-sm transition-all bg-red-50/50">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="text-xs font-bold text-red-800">{pendingItems.disputes} Dispute{pendingItems.disputes !== 1 ? "s" : ""}</div>
              <div className="text-[0.56rem] text-red-500">to resolve</div>
            </div>
          </Link>
        )}
        {pendingItems.applications > 0 && (
          <Link href="/admin/advisors" className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-200 hover:border-violet-300 hover:shadow-sm transition-all">
            <span className="text-lg">👤</span>
            <div>
              <div className="text-xs font-bold text-slate-900">{pendingItems.applications} Application{pendingItems.applications !== 1 ? "s" : ""}</div>
              <div className="text-[0.56rem] text-slate-500">to review</div>
            </div>
          </Link>
        )}
        {pendingItems.feeChanges > 0 && (
          <Link href="/admin/fee-queue" className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all bg-amber-50/50">
            <span className="text-lg">💰</span>
            <div>
              <div className="text-xs font-bold text-amber-800">{pendingItems.feeChanges} Fee Change{pendingItems.feeChanges !== 1 ? "s" : ""}</div>
              <div className="text-[0.56rem] text-amber-600">to confirm</div>
            </div>
          </Link>
        )}
      </div>
      {pendingItems.articlesList.length > 0 && (
        <div className="mt-2 pt-2 border-t border-violet-100">
          <div className="text-[0.56rem] text-slate-500 mb-1">Latest submitted articles:</div>
          {pendingItems.articlesList.map(a => (
            <div key={a.id} className="text-xs text-slate-700 truncate">• <strong>{a.title}</strong> by {a.author_name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
