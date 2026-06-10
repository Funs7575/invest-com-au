import Link from "next/link";
import { DesignIcon } from "@/components/design/DesignIcon";

/**
 * Slim "post a request" strip closing the homepage experts band.
 * One row, two CTAs — the full how-it-works pitch lives at /quotes/post.
 */
export default function HomePostAJob() {
  return (
    <section style={{ padding: "0 36px 48px" }}>
      <div
        className="home-postjob-strip border border-slate-200 bg-slate-50"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          padding: "14px 18px",
          borderRadius: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--color-ink-900)" }}>
            Prefer pros to come to you? Post a request — free.
          </span>
          <p style={{ fontSize: 12, color: "var(--color-ink-500)", margin: "2px 0 0", lineHeight: 1.45 }}>
            Describe what you need; relevant specialists respond with proposals, usually within a
            day. No email until you&apos;re ready to send. Introductions only.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          <Link href="/quotes/recent-wins" className="iv2-cta-ghost" style={{ fontSize: 12 }}>
            See recent requests
          </Link>
          <Link href="/quotes/post" className="iv2-cta" style={{ fontSize: 12.5, padding: "9px 16px" }}>
            Post a request <DesignIcon name="arrow-right" size={12} strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    </section>
  );
}
