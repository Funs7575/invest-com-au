"use client";

import { useState } from "react";

type Props = {
  bookingLink: string;
  advisorName: string;
  /** Shown above CTA, e.g. "Free 15-min consultation" */
  consultationLabel?: string;
};

function getEmbedUrl(url: string): string | null {
  // Calendly: https://calendly.com/<username>/<event-type>
  if (url.includes("calendly.com/")) {
    const base = url.split("?")[0];
    return `${base}?embed_type=Inline&embed_domain=invest.com.au&primary_color=1d4ed8&hide_gdpr_banner=1`;
  }
  // Cal.com: https://cal.com/<username>/<event-type>
  if (url.includes("cal.com/")) {
    const base = url.split("?")[0];
    return `${base}?embed=true`;
  }
  return null;
}

export default function AdvisorCalendarEmbed({
  bookingLink,
  advisorName,
  consultationLabel = "Free consultation",
}: Props) {
  const [open, setOpen] = useState(false);
  const embedUrl = getEmbedUrl(bookingLink);

  if (!embedUrl) {
    // Not a supported embed platform — render a plain CTA link
    return (
      <a
        href={bookingLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Book {consultationLabel}
      </a>
    );
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Book {consultationLabel}
        </button>
      ) : (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-medium text-slate-700">
              Book with {advisorName}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
              aria-label="Close calendar"
            >
              ✕
            </button>
          </div>
          <iframe
            src={embedUrl}
            width="100%"
            height="630"
            frameBorder="0"
            title={`Book a time with ${advisorName}`}
            className="block"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
