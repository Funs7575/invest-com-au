"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { SwitchStory } from "@/lib/types";
import SwitchStoryForm from "@/components/SwitchStoryForm";

interface StoriesClientProps {
  stories: SwitchStory[];
  brokers: { slug: string; name: string }[];
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
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}

export default function StoriesClient({ stories, brokers }: StoriesClientProps) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return stories;
    const q = search.toLowerCase();
    return stories.filter(
      (s) =>
        s.source_broker_slug.toLowerCase().includes(q) ||
        s.dest_broker_slug.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.display_name.toLowerCase().includes(q)
    );
  }, [stories, search]);

  return (
    <div className="py-12">
      <div className="container-custom max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Broker Switching Stories</h1>
        <p className="text-slate-600 mb-6">
          Real stories from Australians who switched brokers. Discover why people moved, what they saved, and whether they&apos;re happy with the change.
        </p>

        {/* CTA */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="mb-6 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Share Your Switching Story
          </button>
        ) : (
          <div className="mb-6">
            <SwitchStoryForm />
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search by broker name, title, or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/30 focus:border-blue-700 mb-6"
        />

        {/* Stories */}
        {filtered.length > 0 ? (
          <div className="space-y-5">
            {filtered.map((story) => (
              <div
                key={story.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow"
              >
                {/* From → To */}
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600">
                    {formatBrokerName(story.source_broker_slug)}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="px-2 py-0.5 rounded-full font-medium bg-slate-50 text-slate-700">
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
                    <span className="text-xs text-emerald-600 font-medium">+{story.dest_rating - story.source_rating} stars</span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 mb-2">{story.title}</h3>

                {/* Body excerpt */}
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-3 line-clamp-4">
                  {story.body}
                </p>

                {/* Reason */}
                {story.reason && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-bold text-blue-700 mb-0.5">Why they switched</p>
                    <p className="text-xs text-slate-700">{story.reason}</p>
                  </div>
                )}

                {/* Badges + meta */}
                <div className="flex flex-wrap items-center gap-2">
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
                  <span className="text-xs text-slate-400 ml-auto">
                    — {story.display_name} ·{" "}
                    {new Date(story.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {/* Link to broker page */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Link
                    href={`/broker/${story.dest_broker_slug}#switch-stories`}
                    className="text-xs text-slate-700 font-medium hover:underline"
                  >
                    See more about {formatBrokerName(story.dest_broker_slug)} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <p className="text-slate-500 text-sm mb-2">
              {search ? "No stories match your search." : "No switching stories yet."}
            </p>
            {!search && (
              <p className="text-slate-400 text-xs">
                Be the first to share your broker switching experience!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
