"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ADVERTISER_DISCLOSURE,
  ADVERTISER_DISCLOSURE_SHORT,
} from "@/lib/compliance";

export default function DisclosureBanner({
  variant = "inline",
}: {
  variant?: "header" | "inline" | "footer";
}) {
  const [expanded, setExpanded] = useState(false);

  if (variant === "header") {
    return (
      <div className="bg-slate-50 border-b border-slate-200 py-2 text-center text-xs text-slate-600">
        <div className="container-custom">
          {ADVERTISER_DISCLOSURE_SHORT}{" "}
          <Link
            href="/how-we-earn"
            className="text-green-700 hover:text-green-800 underline transition-colors"
          >
            How we earn
          </Link>
          {" · "}
          <Link
            href="/methodology"
            className="text-green-700 hover:text-green-800 underline transition-colors"
          >
            Methodology
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <p className="text-xs text-slate-400 leading-relaxed">
        <strong className="text-slate-300">Advertiser Disclosure:</strong>{" "}
        {ADVERTISER_DISCLOSURE}
      </p>
    );
  }

  // "inline" variant — expandable
  return (
    <div className="text-[0.6rem] text-slate-400 leading-relaxed">
      <span>{ADVERTISER_DISCLOSURE_SHORT}</span>{" "}
      <button
        onClick={() => setExpanded(!expanded)}
        className="underline hover:text-slate-600 transition-colors"
      >
        {expanded ? "Less" : "More"}
      </button>
      {expanded && (
        <span className="block mt-1 text-slate-500">
          {ADVERTISER_DISCLOSURE}{" "}
          <Link
            href="/how-we-earn"
            className="text-green-700 hover:text-green-800 underline"
          >
            How we earn
          </Link>
        </span>
      )}
    </div>
  );
}
