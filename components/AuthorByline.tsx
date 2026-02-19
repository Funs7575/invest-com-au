import Link from "next/link";
import Image from "next/image";
import { Linkedin, Twitter } from "lucide-react";
import type { TeamMember } from "@/lib/types";
import { formatRole } from "@/lib/seo";

interface AuthorBylineProps {
  /** Legacy flat-field props (kept for backwards compat) */
  name?: string;
  title?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  verifiedDate?: string;
  variant?: "light" | "dark";
  /** New structured props */
  author?: TeamMember;
  reviewer?: TeamMember;
  reviewedAt?: string;
  changelog?: { date: string; summary: string }[];
  showMethodologyLink?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDateAU(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AuthorByline({
  name = "Market Research Team",
  title = "Invest.com.au",
  linkedinUrl,
  twitterUrl,
  verifiedDate,
  variant = "light",
  author,
  reviewer,
  reviewedAt,
  changelog,
  showMethodologyLink = false,
}: AuthorBylineProps) {
  // Resolve display values: prefer structured `author` over flat fields
  const displayName = author?.full_name || name;
  const displayLinkedin = author?.linkedin_url || linkedinUrl;
  const displayTwitter = author?.twitter_url || twitterUrl;
  const authorSlug = author?.slug;

  const displayDate =
    verifiedDate ||
    new Date().toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const initials = getInitials(displayName);
  const hasSocial = displayLinkedin || displayTwitter;
  const isDark = variant === "dark";

  // Show up to 3 most recent changelog entries
  const recentChanges = changelog?.slice(0, 3) || [];

  return (
    <div className="my-6 space-y-3">
      {/* Main author row */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {author?.avatar_url ? (
          <Image
            src={author.avatar_url}
            alt={displayName}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
              isDark
                ? "bg-white/10 text-white/70"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {initials}
          </div>
        )}

        {/* Text column */}
        <div className="text-left flex-1">
          <p
            className={`font-bold ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            {authorSlug ? (
              <Link
                href={`/authors/${authorSlug}`}
                className={`hover:underline ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {displayName}
              </Link>
            ) : (
              displayName
            )}
          </p>
          <p
            className={`text-sm font-medium ${
              isDark ? "text-green-400" : "text-green-700"
            }`}
          >
            Data verified: {displayDate}
          </p>
        </div>

        {/* Social icons */}
        {hasSocial && (
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {displayLinkedin && (
              <a
                href={displayLinkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${displayName} on LinkedIn`}
                className={`transition-colors ${
                  isDark
                    ? "text-white/40 hover:text-blue-400"
                    : "text-gray-400 hover:text-blue-700"
                }`}
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {displayTwitter && (
              <a
                href={displayTwitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${displayName} on Twitter`}
                className={`transition-colors ${
                  isDark
                    ? "text-white/40 hover:text-sky-400"
                    : "text-gray-400 hover:text-sky-600"
                }`}
              >
                <Twitter className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Reviewer line */}
      {reviewer && (
        <p
          className={`text-sm ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          Reviewed by:{" "}
          <Link
            href={`/reviewers/${reviewer.slug}`}
            className={`font-medium hover:underline ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}
          >
            {reviewer.full_name}
          </Link>
          {reviewer.role && (
            <span className={isDark ? "text-slate-500" : "text-slate-400"}>
              {" "}
              &middot; {formatRole(reviewer.role)}
            </span>
          )}
          {reviewedAt && (
            <span className={isDark ? "text-slate-500" : "text-slate-400"}>
              {" "}
              &middot; {formatDateAU(reviewedAt)}
            </span>
          )}
        </p>
      )}

      {/* Mini changelog */}
      {recentChanges.length > 0 && (
        <div
          className={`text-xs space-y-0.5 ${
            isDark ? "text-slate-500" : "text-slate-400"
          }`}
        >
          {recentChanges.map((entry, i) => (
            <p key={i}>
              <span className="font-medium">
                {formatDateAU(entry.date)}
              </span>
              {" "}&mdash; {entry.summary}
            </p>
          ))}
        </div>
      )}

      {/* Methodology links */}
      {showMethodologyLink && (
        <div
          className={`flex items-center gap-3 text-xs ${
            isDark ? "text-slate-500" : "text-slate-400"
          }`}
        >
          <Link
            href="/how-we-earn"
            className={`hover:underline ${
              isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            How we make money
          </Link>
          <span>&middot;</span>
          <Link
            href="/methodology"
            className={`hover:underline ${
              isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Methodology
          </Link>
          <span>&middot;</span>
          <Link
            href="/editorial-policy"
            className={`hover:underline ${
              isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Editorial policy
          </Link>
        </div>
      )}
    </div>
  );
}
