"use client";

import type { SwitchStory } from "@/lib/types";
import SwitchStoryForm from "./SwitchStoryForm";

interface SwitchStoriesListProps {
  stories: SwitchStory[];
  brokerSlug: string;
  brokerName: string;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          fill={star <= Math.round(rating) ? "#f59e0b" : "none"}
          stroke={star <= Math.round(rating) ? "#f59e0b" : "#cbd5e1"}
          strokeWidth={1.5}
          className="w-3.5 h-3.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
    </div>
  );
}

function formatBrokerName(slug: string): string {
  // Convert slug to display name (e.g. "commsec" -> "Commsec")
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

export default function SwitchStoriesList({ stories, brokerSlug, brokerName }: SwitchStoriesListProps) {
  if (stories.length === 0) {
    return (
      <section className="mb-8" id="switch-stories">
        <h2 className="text-xl font-extrabold text-slate-900 mb-4">Switching Stories</h2>
        <div className="bg-slate-50 rounded-xl p-5 mb-5 text-center">
          <p className="text-sm text-slate-500">No switching stories yet. Be the first to share yours!</p>
        </div>
        <SwitchStoryForm destBrokerSlug={brokerSlug} destBrokerName={brokerName} />
      </section>
    );
  }

  return (
    <section className="mb-8" id="switch-stories">
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Switching Stories</h2>
      <p className="text-sm text-slate-500 mb-4">
        Real stories from people who switched to or from {brokerName}.
      </p>

      {/* Story Cards */}
      <div className="space-y-4 mb-5">
        {stories.map((story) => {
          const isSwitchTo = story.dest_broker_slug === brokerSlug;
          return (
            <div
              key={story.id}
              className="bg-white border border-slate-200 rounded-xl p-5"
            >
              {/* Header: from → to */}
              <div className="flex items-center gap-2 mb-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${isSwitchTo ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}>
                  {formatBrokerName(story.source_broker_slug)}
                </span>
                <span className="text-slate-400">→</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${isSwitchTo ? "bg-slate-50 text-slate-700" : "bg-slate-100 text-slate-600"}`}>
                  {formatBrokerName(story.dest_broker_slug)}
                </span>
              </div>

              {/* Rating comparison */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <StarDisplay rating={story.source_rating} />
                  <span className="text-xs text-slate-400">→</span>
                  <StarDisplay rating={story.dest_rating} />
                </div>
                {story.dest_rating > story.source_rating && (
                  <span className="text-xs text-green-600 font-medium">+{story.dest_rating - story.source_rating} stars</span>
                )}
              </div>

              {/* Title */}
              <h4 className="text-sm font-bold text-slate-900 mb-2">{story.title}</h4>

              {/* Body */}
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-3">
                {story.body}
              </p>

              {/* Reason */}
              {story.reason && (
                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                  <p className="text-xs font-bold text-blue-700 mb-0.5">Why they switched</p>
                  <p className="text-xs text-slate-700">{story.reason}</p>
                </div>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {story.estimated_savings && (
                  <span className="text-xs bg-slate-50 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                    Saves {story.estimated_savings}
                  </span>
                )}
                {story.time_with_source && (
                  <span className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                    {story.time_with_source} with old broker
                  </span>
                )}
              </div>

              {/* Attribution */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  — {story.display_name}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(story.created_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Story Form */}
      <SwitchStoryForm destBrokerSlug={brokerSlug} destBrokerName={brokerName} />
    </section>
  );
}
