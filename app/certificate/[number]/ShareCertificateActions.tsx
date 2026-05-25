"use client";

import { useState } from "react";

interface Props {
  certificateNumber: string;
  /** Course/credential title — used for LinkedIn "Add to profile" deep-link. */
  credentialTitle: string;
  /** Holder display name — prefills LinkedIn "Add to profile" form. */
  holderName: string;
  /** ISO-8601 issue date — used to set LinkedIn start date. */
  issuedAt: string;
}

/**
 * Build a LinkedIn "Add to profile" deep-link.
 *
 * LinkedIn accepts the following params on https://www.linkedin.com/profile/add:
 *   startTask=CERTIFICATION_NAME
 *   name        — credential name (shown as the cert title)
 *   organizationId — LinkedIn org page ID; omitted when unknown
 *   issueYear / issueMonth — from the issuedAt date
 *   certUrl     — verification link (the public certificate page)
 *   certId      — certificate number
 *
 * LinkedIn organisation page for Invest.com.au is not yet claimed, so we
 * use the `organizationName` text param instead of `organizationId`.
 */
function buildLinkedInUrl(
  credentialTitle: string,
  certificateNumber: string,
  issuedAt: string,
): string {
  const date = new Date(issuedAt);
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: credentialTitle,
    organizationName: "Invest.com.au Academy",
    issueYear: String(date.getFullYear()),
    issueMonth: String(date.getMonth() + 1),
    certUrl: `https://invest.com.au/certificate/${certificateNumber}`,
    certId: certificateNumber,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

export default function ShareCertificateActions({
  certificateNumber,
  credentialTitle,
  holderName: _holderName,
  issuedAt,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/certificate/${certificateNumber}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without Clipboard API
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const linkedInUrl = buildLinkedInUrl(credentialTitle, certificateNumber, issuedAt);

  return (
    <div className="flex items-center gap-3 flex-wrap justify-center print:hidden">
      {/* LinkedIn — Add to profile */}
      <a
        href={linkedInUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:ring-offset-2"
        aria-label="Add this certificate to your LinkedIn profile"
      >
        {/* LinkedIn wordmark icon */}
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        Add to LinkedIn
      </a>

      {/* Copy verification link */}
      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        aria-label="Copy certificate verification link"
      >
        {copied ? (
          <>
            <svg
              className="w-4 h-4 text-teal-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Share certificate
          </>
        )}
      </button>

      {/* Print */}
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        aria-label="Print certificate"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        Print
      </button>
    </div>
  );
}
