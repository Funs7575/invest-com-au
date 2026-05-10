import Link from "next/link";
import { splitByLinks, splitByLinksForArticle } from "@/lib/keyword-linking";

interface Props {
  text: string;
  /**
   * Slugs to skip auto-linking — pass the current page's slug and any
   * primary target slugs so we don't self-link an article to itself or
   * link "CommSec" on the CommSec review page.
   */
  skipHrefs?: string[];
  /** Tailwind classes for the wrapper — kept transparent by default. */
  className?: string;
  /**
   * Kill-switch: when true, renders the text as plain prose with no link
   * injection. Controlled by the `internal_link_injection` feature flag
   * checked in the parent RSC page component.
   */
  disabled?: boolean;
  /**
   * Maximum unique keywords to inject as links per block of text.
   * Limits link density — text after the cap renders as plain text.
   * Default: unlimited (existing behaviour when omitted).
   */
  maxLinks?: number;
  /**
   * Topic cluster IDs the current article belongs to (KK-04 iter 2).
   * When provided alongside `maxLinks`, cluster-affine link targets are
   * promoted to fill the cap before positionally-earlier non-affine ones.
   * Obtained via `getClustersForArticle(slug).map(c => c.cluster.id)`.
   */
  clusterIds?: string[];
}

/**
 * Renders prose with first-occurrence internal links wrapped as real
 * <Link>s. Keeps the whitespace-pre-line flow of plain text so pasted
 * copy still breaks on newlines.
 *
 * Safer than dangerouslySetInnerHTML — the keyword-linking engine
 * returns an array of `string | {href,label}` nodes that React renders
 * natively.
 */
export default function LinkifiedText({ text, skipHrefs, className, disabled, maxLinks, clusterIds }: Props) {
  if (!text) return null;

  const wrapperClass = `max-w-none text-slate-700 leading-relaxed whitespace-pre-line ${className ?? ""}`;

  if (disabled) {
    return <div className={wrapperClass}>{text}</div>;
  }

  const skip = new Set(skipHrefs ?? []);
  const parts = clusterIds?.length
    ? splitByLinksForArticle(text, clusterIds, maxLinks)
    : splitByLinks(text, maxLinks);

  return (
    <div className={wrapperClass}>
      {parts.map((p, i) => {
        if (typeof p === "string") return <span key={i}>{p}</span>;
        if (skip.has(p.href)) return <span key={i}>{p.label}</span>;
        return (
          <Link
            key={i}
            href={p.href}
            title={p.title}
            rel={p.rel}
            className="text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-800"
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
