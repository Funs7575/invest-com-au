"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";

type ProductType = "broker" | "etf" | "advisor" | "property";

interface Props {
  productType: ProductType;
  productRef: string;
  initialCount?: number;
}

/**
 * "I use this" badge displayed on product cards.
 *
 * - Shows a live count of verified users ("N people use this").
 * - Authenticated users can toggle their own verification on/off.
 * - Unauthenticated users see a "Sign in to verify" prompt.
 * - Optimistic update: the count flips instantly, rolls back on error.
 */
export default function UserVerifiedBadge({ productType, productRef, initialCount = 0 }: Props) {
  const { user, loading } = useUser();
  const [count, setCount] = useState(initialCount);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Once the user is known, check whether they have already verified this product.
  useEffect(() => {
    if (!user || fetching) return;
    setFetching(true);
    void fetch("/api/account/verified-products", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { verifications?: Array<{ product_type: string; product_ref: string }> } | null) => {
        if (!json?.verifications) return;
        const found = json.verifications.some(
          (v) => v.product_type === productType && v.product_ref === productRef,
        );
        setVerified(found);
      })
      .catch(() => {/* ignore */})
      .finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const toggle = async () => {
    if (busy || !user) return;
    setBusy(true);
    const wasVerified = verified;
    const delta = wasVerified ? -1 : 1;
    setVerified(!wasVerified);
    setCount((c) => Math.max(0, c + delta));

    try {
      const res = await fetch("/api/account/verified-products", {
        method: wasVerified ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_type: productType, product_ref: productRef }),
      });
      if (!res.ok && res.status !== 409) {
        // Rollback on genuine error; 409 means already-verified — state is correct.
        setVerified(wasVerified);
        setCount((c) => Math.max(0, c - delta));
      }
    } catch {
      setVerified(wasVerified);
      setCount((c) => Math.max(0, c - delta));
    } finally {
      setBusy(false);
    }
  };

  const countLabel = count === 1 ? "1 person uses this" : `${count} people use this`;

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      {count > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
          <svg
            className="w-3 h-3 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
          {countLabel}
        </span>
      )}

      {!loading && !user && (
        <Link
          href={`/account/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
          className="text-xs text-slate-500 hover:text-violet-700 underline-offset-2 hover:underline"
        >
          Sign in to verify
        </Link>
      )}

      {!loading && user && (
        <button
          type="button"
          onClick={() => { void toggle(); }}
          disabled={busy || fetching}
          aria-pressed={verified}
          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
            verified
              ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
              : "bg-white text-slate-600 border-slate-300 hover:border-emerald-400 hover:text-emerald-700"
          }`}
        >
          {verified ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              I use this
            </>
          ) : (
            "I use this"
          )}
        </button>
      )}
    </div>
  );
}
