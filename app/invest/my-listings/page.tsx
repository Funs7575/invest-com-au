"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { formatDate } from "@/lib/utils";
import { assessLotTransparencyLite, transparencyLevelLabel } from "@/lib/listings/lot-transparency";

interface Listing {
  id: number;
  title: string;
  slug: string;
  vertical: string;
  status: string;
  asking_price_cents: number | null;
  price_display: string | null;
  listing_type: string;
  views: number;
  enquiries: number;
  created_at: string;
  expires_at: string | null;
  images?: string[] | null;
  description?: string | null;
  location_state?: string | null;
  location_city?: string | null;
  key_metrics?: Record<string, unknown> | null;
}

interface CategoryBenchmark {
  median_views: number;
  median_enquiries: number;
  sample: number;
}

interface Enquiry {
  id: number;
  listing_id: number;
  user_name: string;
  user_email: string;
  message: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-700 bg-amber-50 border-amber-200",
  active: "text-emerald-700 bg-emerald-50 border-emerald-200",
  expired: "text-red-700 bg-red-50 border-red-200",
  inactive: "text-slate-600 bg-slate-100 border-slate-200",
};

function formatPrice(cents: number | null, display: string | null): string {
  if (display) return display;
  if (!cents) return "Price on enquiry";
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}K`;
  return `$${(cents / 100).toLocaleString("en-AU")}`;
}

function verticalToPath(vertical: string, slug: string): string {
  const pathMap: Record<string, string> = {
    fund: `/invest/funds/${slug}`,
    franchise: `/invest/franchise/listings/${slug}`,
    business: `/invest/business/listings/${slug}`,
    mining: `/invest/mining/listings/${slug}`,
    farmland: `/invest/farmland/listings/${slug}`,
    infrastructure: `/invest/infrastructure/listings/${slug}`,
    private_credit: `/invest/private-credit/listings/${slug}`,
    renewable_energy: `/invest/renewable-energy/listings/${slug}`,
    commercial_property: `/invest/commercial-property/listings/${slug}`,
    alternatives: `/invest/alternatives/listings/${slug}`,
    startups: `/invest/startups/listings/${slug}`,
  };
  return pathMap[vertical] || `/invest/${vertical}/${slug}`;
}

type Stage = "email" | "code" | "results";

export default function MyListingsPage() {
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [enquiries, setEnquiries] = useState<Record<number, Enquiry[]>>({});
  const [benchmarks, setBenchmarks] = useState<Record<string, CategoryBenchmark>>({});
  const [expandedListing, setExpandedListing] = useState<number | null>(null);
  const [soldFormListing, setSoldFormListing] = useState<number | null>(null);
  const [soldPriceInput, setSoldPriceInput] = useState("");
  const [markingSold, setMarkingSold] = useState(false);

  const resetToEmail = () => {
    setStage("email");
    setCode("");
    setError(null);
    setListings([]);
    setEnquiries({});
    setExpandedListing(null);
  };

  const fetchListings = async (currentEmail: string) => {
    setLoadingListings(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/listings/my-listings?email=${encodeURIComponent(currentEmail)}`,
        { credentials: "same-origin" },
      );
      const data = await res.json();

      if (res.status === 401) {
        // Cookie missing/expired/email-mismatch — bounce to OTP flow.
        setStage("email");
        setError(
          "Verification expired. Please re-enter your email to receive a new code.",
        );
        return;
      }

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setListings(data.listings || []);
      setEnquiries(data.enquiries || {});
      setBenchmarks(data.benchmarks || {});
      setStage("results");
    } catch {
      setError("Failed to load listings. Please try again.");
    } finally {
      setLoadingListings(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSendingCode(true);
    setError(null);

    try {
      const res = await fetch("/api/verify-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to send verification code.");
        return;
      }
      setStage("code");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const res = await fetch("/api/listings/my-listings/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Incorrect code. Please try again.");
        return;
      }
      // Cookie is now set; fetch the listings.
      await fetchListings(email.trim());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setSendingCode(true);
    try {
      const res = await fetch("/api/verify-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to resend the code.");
        return;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSendingCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900">
            My Listings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View your submitted listings and manage investor enquiries.
          </p>
        </div>

        {/* Step 1: email */}
        {stage === "email" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 max-w-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Find your listings
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Enter the email you used to submit your listing. We&apos;ll send
              you a 6-digit code to verify it&apos;s you.
            </p>
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={sendingCode}
                className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {sendingCode ? "Sending code..." : "Send code"}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: 6-digit code */}
        {stage === "code" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 max-w-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Enter the code
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              We sent a 6-digit code to{" "}
              <strong className="text-slate-700">{email}</strong>. Enter it
              below to view your listings.
            </p>
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  6-digit code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-lg tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={verifying || loadingListings}
                className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {verifying || loadingListings
                  ? "Verifying..."
                  : "Verify and view listings"}
              </button>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={resetToEmail}
                  className="hover:text-slate-700 underline-offset-2 hover:underline"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={sendingCode}
                  className="hover:text-slate-700 underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingCode ? "Sending..." : "Resend code"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: results */}
        {stage === "results" && (
          <div>
            {/* Back / change email */}
            <button
              onClick={resetToEmail}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-6"
            >
              <Icon name="arrow-left" size={14} />
              Use a different email
            </button>

            {listings.length === 0 ? (
              /* Empty state */
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Icon
                  name="inbox"
                  size={40}
                  className="text-slate-300 mx-auto mb-3"
                />
                <p className="text-slate-700 font-medium mb-1">
                  No listings found for this email.
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  If you recently submitted a listing, it may take a moment to
                  appear.
                </p>
                <Link
                  href="/invest/list"
                  className="inline-block bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Submit a new listing
                </Link>
              </div>
            ) : (
              /* Listing cards */
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  {listings.length} listing{listings.length !== 1 ? "s" : ""}{" "}
                  found for <strong className="text-slate-700">{email}</strong>
                </p>

                {listings.map((listing) => {
                  const listingEnquiries = enquiries[listing.id] || [];
                  const isExpanded = expandedListing === listing.id;

                  return (
                    <div
                      key={listing.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                    >
                      {/* Card header */}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 truncate">
                              {listing.title}
                            </h3>
                            <p className="text-xs text-slate-500 capitalize mt-0.5">
                              {listing.vertical.replace(/_/g, " ")}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-[0.65rem] font-bold px-2 py-0.5 rounded-full border ${
                              STATUS_COLORS[listing.status] ||
                              "text-slate-600 bg-slate-100 border-slate-200"
                            }`}
                          >
                            {listing.status.charAt(0).toUpperCase() +
                              listing.status.slice(1)}
                          </span>
                        </div>

                        {/* Price */}
                        <p className="text-lg font-extrabold text-slate-900 mb-3">
                          {formatPrice(
                            listing.asking_price_cents,
                            listing.price_display,
                          )}
                        </p>

                        {/* Stats row */}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Icon
                              name="eye"
                              size={13}
                              className="text-slate-500"
                            />
                            {listing.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon
                              name="mail"
                              size={13}
                              className="text-slate-500"
                            />
                            {listing.enquiries} enquiries
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon
                              name="calendar"
                              size={13}
                              className="text-slate-500"
                            />
                            Listed {formatDate(listing.created_at)}
                          </span>
                          {listing.expires_at && (
                            <span className="flex items-center gap-1">
                              <Icon
                                name="clock"
                                size={13}
                                className="text-slate-500"
                              />
                              Expires {formatDate(listing.expires_at)}
                            </span>
                          )}
                        </div>

                        {/* Performance vs category + transparency nudge (idea #20) */}
                        {(() => {
                          const bench = benchmarks[listing.vertical];
                          const transparency = assessLotTransparencyLite(listing);
                          const unmet = transparency.checks.filter((c) => !c.met);
                          const viewsDelta =
                            bench && bench.median_views > 0
                              ? Math.round(((listing.views - bench.median_views) / bench.median_views) * 100)
                              : null;
                          return (
                            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-600 space-y-1">
                              {bench && (
                                <p>
                                  <span className="font-semibold text-slate-800">Performance:</span>{" "}
                                  {listing.views} views vs. {bench.median_views} category median
                                  {viewsDelta !== null && viewsDelta !== 0 && (
                                    <span className={viewsDelta > 0 ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                                      {" "}({viewsDelta > 0 ? "+" : ""}{viewsDelta}%)
                                    </span>
                                  )}
                                  {" · "}
                                  {listing.enquiries} enquiries vs. {bench.median_enquiries} median
                                </p>
                              )}
                              <p>
                                <span className="font-semibold text-slate-800">Transparency:</span>{" "}
                                {transparencyLevelLabel(transparency.level)} ({transparency.metCount}/{transparency.total})
                                {unmet.length > 0 && transparency.level !== "comprehensive" && (
                                  <span className="text-slate-500"> — next: {unmet[0]?.label.toLowerCase()}</span>
                                )}
                              </p>
                            </div>
                          );
                        })()}

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                          {listing.status === "active" && (
                            <Link
                              href={verticalToPath(
                                listing.vertical,
                                listing.slug,
                              )}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                            >
                              <Icon name="external-link" size={13} />
                              View live listing
                            </Link>
                          )}
                          {listingEnquiries.length > 0 && (
                            <button
                              onClick={() =>
                                setExpandedListing(
                                  isExpanded ? null : listing.id,
                                )
                              }
                              className="text-sm text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
                            >
                              <Icon
                                name={isExpanded ? "chevron-up" : "chevron-down"}
                                size={13}
                              />
                              {listingEnquiries.length} enquir
                              {listingEnquiries.length === 1 ? "y" : "ies"}
                            </button>
                          )}
                          {listing.status === "active" && (
                            <button
                              onClick={() => {
                                setSoldPriceInput("");
                                setSoldFormListing(
                                  soldFormListing === listing.id ? null : listing.id,
                                );
                              }}
                              className="text-sm text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1"
                            >
                              <Icon name="check-circle" size={13} />
                              Mark sold
                            </button>
                          )}
                        </div>

                        {/* Mark-sold inline form: optional disclosed price.
                            Disclosed sales feed the public comps archive;
                            undisclosed ones still close the listing. */}
                        {soldFormListing === listing.id && (
                          <form
                            className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-wrap items-end gap-3"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (markingSold) return;
                              setMarkingSold(true);
                              setError(null);
                              try {
                                const dollars = Number(soldPriceInput.replace(/[,$\s]/g, ""));
                                const res = await fetch("/api/listings/my-listings/mark-sold", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    listing_id: listing.id,
                                    sold_price_cents:
                                      soldPriceInput.trim() && Number.isFinite(dollars) && dollars > 0
                                        ? Math.round(dollars * 100)
                                        : null,
                                  }),
                                });
                                if (!res.ok) throw new Error("mark-sold failed");
                                setSoldFormListing(null);
                                await fetchListings(email);
                              } catch {
                                setError("Couldn't mark that listing sold. Try again?");
                              } finally {
                                setMarkingSold(false);
                              }
                            }}
                          >
                            <label className="flex flex-col text-xs font-semibold text-slate-700">
                              Sale price (optional, AUD)
                              <input
                                type="text"
                                inputMode="numeric"
                                value={soldPriceInput}
                                onChange={(e) => setSoldPriceInput(e.target.value)}
                                placeholder="e.g. 450,000"
                                className="mt-1 px-3 py-2 rounded-md border border-slate-300 text-sm font-normal w-44"
                              />
                            </label>
                            <button
                              type="submit"
                              disabled={markingSold}
                              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-sm font-bold px-4 py-2 rounded-md"
                            >
                              {markingSold ? "Saving…" : "Confirm sold"}
                            </button>
                            <p className="basis-full text-xs text-slate-500">
                              Disclosing the price adds this sale to the public
                              comparable-sales archive. Leave blank to keep it
                              undisclosed.
                            </p>
                          </form>
                        )}
                      </div>

                      {/* Enquiries panel */}
                      {isExpanded && listingEnquiries.length > 0 && (
                        <div className="border-t border-slate-200 bg-slate-50 p-4">
                          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                            Investor Enquiries
                          </h4>
                          <div className="space-y-3">
                            {listingEnquiries.map((enquiry) => (
                              <div
                                key={enquiry.id}
                                className="bg-white rounded-lg border border-slate-200 p-3"
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {enquiry.user_name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {enquiry.user_email}
                                    </p>
                                  </div>
                                  <span className="text-[0.65rem] text-slate-500 shrink-0">
                                    {formatDate(enquiry.created_at)}
                                  </span>
                                </div>
                                {enquiry.message && (
                                  <p className="text-sm text-slate-600 mt-2 whitespace-pre-line break-words">
                                    {enquiry.message}
                                  </p>
                                )}
                                <div className="mt-2">
                                  <a
                                    href={`mailto:${enquiry.user_email}?subject=Re: ${encodeURIComponent(listing.title)}&body=${encodeURIComponent(`Hi ${enquiry.user_name},\n\nThank you for your enquiry about "${listing.title}".\n\n`)}`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                                  >
                                    <Icon name="mail" size={12} />
                                    Reply
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
