"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

const PROOF: ReadonlyArray<readonly [string, string]> = [
  ["#60a5fa", "JM"],
  ["#34d399", "RK"],
  ["#fbbf24", "SP"],
  ["#f87171", "AT"],
];

export default function HomeFridayBriefing() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || pending) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/email-capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: "home-friday-briefing" }),
        });
        setStatus(res.ok ? "ok" : "err");
        if (res.ok) setEmail("");
      } catch {
        setStatus("err");
      }
    });
  }

  return (
    <section
      style={{
        padding: "32px 36px",
        background: "var(--color-sand-50)",
        borderTop: "1px solid var(--color-sand-200)",
        borderBottom: "1px solid var(--color-sand-200)",
      }}
    >
      <div
        className="home-briefing-grid"
        style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 2fr 1.2fr", gap: 32, alignItems: "center" }}
      >
        <div>
          <span className="iv2-mini" style={{ color: "var(--color-coral-600)" }}>
            ● The Friday Briefing
          </span>
          <div
            className="font-serif"
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "var(--color-ink-900)",
              lineHeight: 1.15,
              letterSpacing: "-.012em",
              marginTop: 4,
            }}
          >
            One email, every Friday. What just moved your money.
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: "var(--color-ink-400)" }}>
            <div style={{ display: "flex" }} aria-hidden>
              {PROOF.map(([c, initials], i) => (
                <div
                  key={c}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 99,
                    background: c,
                    border: "2px solid var(--color-sand-50)",
                    marginLeft: i ? -6 : 0,
                    fontSize: 7.5,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "black",
                  }}
                >
                  {initials}
                </div>
              ))}
            </div>
            <span style={{ fontWeight: 700, color: "var(--color-ink-900)" }}>Free · weekly</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "stretch" }} noValidate>
          <label htmlFor="briefing-email" className="sr-only">Email address</label>
          <input
            id="briefing-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 9,
              border: "1px solid var(--color-sand-200)",
              fontSize: 14,
              fontFamily: "inherit",
              background: "white",
              color: "var(--color-ink-900)",
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            className="iv2-cta-ink"
            style={{ padding: "12px 20px", fontSize: 13.5 }}
            disabled={pending}
          >
            {pending ? "Subscribing…" : status === "ok" ? "Subscribed ✓" : "Subscribe — free"}
          </button>
        </form>

        <div style={{ fontSize: 11, color: "var(--color-ink-400)", lineHeight: 1.5, textAlign: "right" }}>
          Last issue:{" "}
          <span style={{ color: "var(--color-ink-900)", fontWeight: 600 }}>
            &ldquo;The RBA hold: what your HISA does next&rdquo;
          </span>
          <br />
          <Link href="/articles" style={{ color: "var(--color-ink-500)", textDecoration: "none", fontWeight: 600 }}>
            Browse all archives →
          </Link>
          <br />
          <span style={{ fontSize: 10, color: "var(--color-ink-400)" }}>
            Unsubscribe anytime · No third-party sharing
          </span>
        </div>
      </div>

      {status === "err" && (
        <div style={{ maxWidth: 1280, margin: "10px auto 0", color: "var(--color-coral-700)", fontSize: 12, textAlign: "center" }}>
          Couldn&apos;t subscribe — please check the email and try again.
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .home-briefing-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .home-briefing-grid > :last-child { text-align: left !important; }
        }
      `}</style>
    </section>
  );
}
