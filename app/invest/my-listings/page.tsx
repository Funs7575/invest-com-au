"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function verticalToPath(vertical: string, slug: string): string {
  const pathMap: Record<string, string> = {
    fund: `/invest/funds/${slug}`,
    franchise: `/invest/franchise/listings/${slug}`,
    business: `/invest/business/listings/${slug}`,
    mining: `/invest/mining/opportunities/${slug}`,
    farmland: `/invest/farmland/listings/${slug}`,
    infrastructure: `/invest/infrastructure/listings/${slug}`,
    private_credit: `/invest/private-credit/listings/${slug}`,
    renewable_energy: `/invest/renewable-energy/projects/${slug}`,
    commercial_property: `/invest/commercial-property/listings/${slug}`,
    alternatives: `/invest/alternatives/listings/${slug}`,
    startups: `/invest/startups/opportunities/${slug}`,
  };
  return pathMap[vertical] || `/invest/${vertical}/${slug}`;
}

export default function MyListingsPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [enquiries, setEnquiries] = useState<Record<number, Enquiry[]>>({});
  const [expandedListing, setExpandedListing] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/listings/my-listings?email=${encodeURIComponent(email.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setListings(data.listings || []);
      setEnquiries(data.enquiries || {});
      setSubmitted(true);
    } catch {
      setError("Failed to load listings. Please try again.");
    } finally {
      setLoading(false);
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

        {/* Email lookup form */}
        {!submitted && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 max-w-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Find your listings
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Enter the email you used to submit your listing.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? "Looking up..." : "View my listings"}
              </button>
            </form>
          </div>
        )}

        {/* Results */}
        {submitted && (
          <div>
            {/* Back / change email */}
            <button
              onClick={() => {
                setSubmitted(false);
                setListings([]);
                setEnquiries({});
                setExpandedListing(null);
              }}
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
                  href="/invest/submit"
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
                            <p className="text-xs text-slate-400 capitalize mt-0.5">
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
                            listing.price_display
                          )}
                        </p>

                        {/* Stats row */}
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Icon name="eye" size={13} className="text-slate-400" />
                            {listing.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="mail" size={13} className="text-slate-400" />
                            {listing.enquiries} enquiries
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="calendar" size={13} className="text-slate-400" />
                            Listed {formatDate(listing.created_at)}
                          </span>
                          {listing.expires_at && (
                            <span className="flex items-center gap-1">
                              <Icon name="clock" size={13} className="text-slate-400" />
                              Expires {formatDate(listing.expires_at)}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                          {listing.status === "active" && (
                            <Link
                              href={verticalToPath(
                                listing.vertical,
                                listing.slug
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
                                  isExpanded ? null : listing.id
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
                        </div>
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
                                    <p className="text-xs text-slate-400">
                                      {enquiry.user_email}
                                    </p>
                                  </div>
                                  <span className="text-[0.65rem] text-slate-400 shrink-0">
                                    {formatDate(enquiry.created_at)}
                                  </span>
                                </div>
                                {enquiry.message && (
                                  <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">
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
