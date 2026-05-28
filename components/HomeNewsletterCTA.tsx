"use client";

import { useState, useTransition } from "react";

const AVATAR_COLOURS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa"] as const;
const AVATAR_INITIALS = ["SK", "ML", "TR", "JB", "AW"] as const;

export default function HomeNewsletterCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || pending) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), source: "newsletter" }),
        });
        if (res.ok) {
          setStatus("ok");
          setEmail("");
        } else {
          const body = await res.json().catch(() => ({}));
          setErrMsg((body as { error?: string }).error ?? "Please try again.");
          setStatus("err");
        }
      } catch {
        setErrMsg("Network error — please try again.");
        setStatus("err");
      }
    });
  }

  return (
    <section
      style={{
        background: "#0f172a",
        padding: "52px 36px",
      }}
    >
      <div
        className="home-newsletter-inner"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 20,
        }}
      >
        {/* Eyebrow */}
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "#2dd4bf",
          }}
        >
          Free weekly newsletter
        </span>

        {/* Headline */}
        <h2
          className="font-display"
          style={{
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: "-.028em",
            lineHeight: 1.07,
            color: "#f8fafc",
            margin: 0,
            textWrap: "balance",
          }}
        >
          Stay ahead of the market.{" "}
          <span className="text-teal-400">Free weekly insights.</span>
        </h2>

        {/* Sub-copy */}
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: "#94a3b8",
            margin: 0,
            maxWidth: 520,
          }}
        >
          Join 12,000+ Australians getting the best investment ideas every Friday.
        </p>

        {/* Social proof avatars */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
          aria-hidden
        >
          <div style={{ display: "flex" }}>
            {AVATAR_COLOURS.map((colour, i) => (
              <div
                key={colour}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 99,
                  background: colour,
                  border: "2px solid #0f172a",
                  marginLeft: i ? -8 : 0,
                  fontSize: 8,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0f172a",
                }}
              >
                {AVATAR_INITIALS[i]}
              </div>
            ))}
          </div>
          <span className="text-slate-500" style={{ fontSize: 12 }}>
            12,000+ subscribers · No spam · Unsubscribe anytime
          </span>
        </div>

        {/* Form or success state */}
        {status === "ok" ? (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#022c22",
              border: "1px solid #14532d",
              borderRadius: 12,
              padding: "14px 22px",
              fontSize: 14,
              color: "#4ade80",
              fontWeight: 600,
            }}
          >
            <span aria-hidden style={{ fontSize: 18 }}>✓</span>
            You&apos;re subscribed — check your inbox for a confirmation email.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            style={{
              display: "flex",
              gap: 8,
              width: "100%",
              maxWidth: 480,
              alignItems: "stretch",
            }}
          >
            <label htmlFor="newsletter-cta-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-cta-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "err") setStatus("idle");
              }}
              style={{
                flex: 1,
                padding: "13px 16px",
                borderRadius: 10,
                border: status === "err" ? "1.5px solid #f87171" : "1.5px solid #1e293b",
                fontSize: 14,
                fontFamily: "inherit",
                background: "#1e293b",
                color: "#f8fafc",
                minWidth: 0,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={pending}
              style={{
                padding: "13px 22px",
                borderRadius: 10,
                border: "none",
                background: "#0d9488",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: pending ? "default" : "pointer",
                whiteSpace: "nowrap",
                opacity: pending ? 0.75 : 1,
                fontFamily: "inherit",
                flexShrink: 0,
                transition: "opacity 0.15s",
              }}
            >
              {pending ? "Subscribing…" : "Subscribe"}
            </button>
          </form>
        )}

        {/* Inline error */}
        {status === "err" && (
          <p
            role="alert"
            style={{
              margin: 0,
              fontSize: 13,
              color: "#f87171",
            }}
          >
            {errMsg}
          </p>
        )}

        {/* Fine print */}
        {status !== "ok" && (
          <p
            style={{
              margin: 0,
              fontSize: 11.5,
              color: "#475569",
              lineHeight: 1.5,
            }}
          >
            Free · Every Friday · No third-party sharing
          </p>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .home-newsletter-inner form {
            flex-direction: column !important;
          }
        }
      `}</style>
    </section>
  );
}
