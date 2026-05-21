"use client";

import { useState, useRef } from "react";

type CertStatus = "none" | "pending" | "verified" | "rejected" | "expired";

type CertRecord = {
  id: string;
  certification_type: string;
  status: string;
  expires_at: string;
  verified_at: string | null;
};

type Props = {
  existing: CertRecord | null;
};

const CERT_TYPE_LABELS: Record<string, string> = {
  s708_sophisticated: "Sophisticated Investor (s708 Corporations Act)",
  professional_investor: "Professional Investor",
};

function certStatus(cert: CertRecord | null): CertStatus {
  if (!cert) return "none";
  if (cert.status === "pending") return "pending";
  if (cert.status === "rejected") return "rejected";
  if (cert.status === "verified") {
    return new Date(cert.expires_at) > new Date() ? "verified" : "expired";
  }
  return "none";
}

function StatusBadge({ status }: { status: CertStatus }) {
  const config = {
    none: { bg: "bg-slate-100", text: "text-slate-600", label: "Not certified" },
    pending: { bg: "bg-amber-100", text: "text-amber-800", label: "Under review" },
    verified: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Active" },
    rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
    expired: { bg: "bg-slate-100", text: "text-slate-600", label: "Expired" },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "verified"
            ? "bg-emerald-500"
            : status === "pending"
              ? "bg-amber-500"
              : "bg-slate-400"
        }`}
      />
      {config.label}
    </span>
  );
}

export default function WholesaleCertClient({ existing }: Props) {
  const status = certStatus(existing);
  const canSubmit = status === "none" || status === "rejected" || status === "expired";

  const [certType, setCertType] = useState<"s708_sophisticated" | "professional_investor">("s708_sophisticated");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select an evidence document.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.append("certification_type", certType);
    fd.append("evidence_doc", file);

    try {
      const res = await fetch("/api/wholesale-investor-cert/submit", {
        method: "POST",
        body: fd,
      });

      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Submission failed. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">✅</div>
        <h2 className="text-lg font-bold text-emerald-900 mb-2">Certification submitted</h2>
        <p className="text-sm text-emerald-800">
          Your evidence document has been received. Our team will review it within 1–2 business days.
          You will be notified by email when your certification is approved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current status card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Certification status</h2>
          <StatusBadge status={status} />
        </div>

        {status === "verified" && existing && (
          <div className="text-sm text-slate-600 space-y-1">
            <p>
              <span className="font-medium">Type:</span>{" "}
              {CERT_TYPE_LABELS[existing.certification_type] ?? existing.certification_type}
            </p>
            <p>
              <span className="font-medium">Verified:</span>{" "}
              {existing.verified_at
                ? new Date(existing.verified_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </p>
            <p>
              <span className="font-medium">Expires:</span>{" "}
              {new Date(existing.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              This certification is recognised across all wholesale-gated listings on the platform,
              including startup data rooms, pre-IPO tranches, and digital infrastructure assets.
            </p>
          </div>
        )}

        {status === "pending" && (
          <p className="text-sm text-amber-800">
            Your certification is under review. Our team typically reviews submissions within 1–2 business days.
          </p>
        )}

        {status === "rejected" && (
          <div className="text-sm text-red-800 space-y-1">
            <p>Your previous submission was not approved. Common reasons include:</p>
            <ul className="list-disc list-inside ml-2 space-y-0.5 text-xs">
              <li>Accountant certificate was not signed or dated within the last 6 months</li>
              <li>Document did not clearly state the s708 net assets / income threshold</li>
              <li>Professional investor evidence did not reference a current ASIC licence</li>
            </ul>
            <p className="mt-2">Please submit a new, corrected document below.</p>
          </div>
        )}

        {status === "expired" && (
          <p className="text-sm text-slate-600">
            Your certification expired on{" "}
            {existing ? new Date(existing.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "—"}.
            s708 certifications must be renewed every 6 months. Please upload a fresh accountant certificate.
          </p>
        )}
      </div>

      {/* Submission form — only shown when cert can be submitted */}
      {canSubmit && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-700">
            {status === "none" ? "Submit certification" : "Resubmit certification"}
          </h2>

          {/* What type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Certification type
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-violet-300 transition-colors has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50">
                <input
                  type="radio"
                  name="cert_type"
                  value="s708_sophisticated"
                  checked={certType === "s708_sophisticated"}
                  onChange={() => setCertType("s708_sophisticated")}
                  className="mt-0.5 shrink-0"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">Sophisticated Investor (s708)</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Net assets ≥ $2.5M or gross income ≥ $250K/yr for 2 of last 2 years.
                    Requires a signed accountant certificate (CA or CPA, current within 6 months).
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:border-violet-300 transition-colors has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50">
                <input
                  type="radio"
                  name="cert_type"
                  value="professional_investor"
                  checked={certType === "professional_investor"}
                  onChange={() => setCertType("professional_investor")}
                  className="mt-0.5 shrink-0"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800">Professional Investor</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Holds AFSL or is an AFSL authorised representative, registered managed investment scheme,
                    or other entity under s9 Corporations Act 2001.
                    Requires AFSL licence extract or ASIC Register confirmation.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Evidence upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Evidence document
              <span className="text-slate-400 font-normal ml-1">(PDF, JPG, or PNG · max 10 MB)</span>
            </label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-violet-300 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="text-sm text-slate-700">
                  <span className="font-medium">{file.name}</span>
                  <span className="text-slate-400 ml-2">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Click to upload your certificate</p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Compliance notice */}
          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 space-y-1">
            <p className="font-semibold text-slate-600">Important — for your records</p>
            <p>
              By submitting, you confirm the evidence document is genuine and relates to your current
              financial position. Invest.com.au reviews certifications for platform eligibility only —
              this is not a legal determination of your status as a wholesale investor.
              You are responsible for independently verifying your wholesale investor status with
              your own legal or financial adviser.
            </p>
            <p>
              s708 certifications expire 6 months from the date of accountant sign-off (s708(8) Corporations Act 2001).
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !file}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      )}

      {/* Guidance box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-blue-800 mb-2">What counts as acceptable evidence?</h3>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>
            <span className="font-medium">s708 sophisticated:</span> Accountant certificate on letterhead,
            signed by a CA or CPA, stating net assets or gross income meeting the threshold,
            dated within the last 6 months.
          </li>
          <li>
            <span className="font-medium">Professional investor:</span> AFSL licence extract from{" "}
            <a href="https://moneysmart.gov.au/financial-advisers/check-your-financial-adviser" className="underline" target="_blank" rel="noopener noreferrer">
              ASIC&apos;s register
            </a>{" "}
            or authorisation letter from an AFSL holder, dated within 12 months.
          </li>
        </ul>
      </div>
    </div>
  );
}
