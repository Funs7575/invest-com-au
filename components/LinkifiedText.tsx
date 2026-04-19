import Link from "next/link";
import { splitByLinks } from "@/lib/keyword-linking";

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
export default function LinkifiedText({ text, skipHrefs, className }: Props) {
  if (!text) return null;
  const skip = new Set(skipHrefs ?? []);
  const parts = splitByLinks(text);

  return (
    <div
      className={`max-w-none text-slate-700 leading-relaxed whitespace-pre-line ${className ?? ""}`}
    >
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
