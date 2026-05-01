"use client";

import { useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";

// Lightweight homepage search affordance. Submits to /articles?q=... which
// is the existing search-friendly page (accepts q + category params). When
// a unified /search page is built later, point this there instead — for
// now /articles is the closest thing to "search across content".
//
// Below the route cards, gives visitors who arrive looking for something
// specific (a broker name, an article topic) an immediate path without
// scrolling through sections.
export default function HomeSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = q.trim();
      if (!trimmed) return;
      router.push(`/articles?q=${encodeURIComponent(trimmed)}`);
    },
    [q, router],
  );

  return (
    <section style={{ padding: "0 36px 8px", maxWidth: 1280, margin: "0 auto" }}>
      <form
        onSubmit={onSubmit}
        role="search"
        aria-label="Search platforms, experts, listings or guides"
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 14px",
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          boxShadow: "0 1px 2px rgba(11,20,34,.04)",
          alignItems: "center",
        }}
      >
        <svg
          aria-hidden
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={{ color: "var(--color-ink-400)", flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search platforms, experts, listings or guides..."
          aria-label="Search"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: 14,
            fontFamily: "inherit",
            color: "var(--color-ink-900)",
            background: "transparent",
          }}
        />
        <button
          type="submit"
          className="iv2-cta"
          style={{ fontSize: 13, padding: "8px 16px", borderRadius: 10 }}
        >
          Search
        </button>
      </form>
    </section>
  );
}
