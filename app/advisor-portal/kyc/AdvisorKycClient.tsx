"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface KycDoc {
  id: number;
  document_type: string;
  storage_path: string;
  original_filename: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  status: "submitted" | "verified" | "rejected" | "expired";
  verified_at: string | null;
  verification_notes: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  uploaded_at: string;
}

const DOC_TYPES: Array<{ value: string; label: string; required: boolean; hint: string }> = [
  {
    value: "afsl_certificate",
    label: "AFSL certificate",
    required: true,
    hint: "Your ASIC-issued Australian Financial Services Licence certificate. Include the expiry date below if it's time-limited.",
  },
  {
    value: "proof_of_id",
    label: "Proof of ID",
    required: true,
    hint: "Current passport or driver's licence. Must show your full name, DOB and photo.",
  },
  {
    value: "abn_certificate",
    label: "ABN / ACN certificate",
    required: true,
    hint: "Current ABN extract from the ABR, or ACN certificate from ASIC.",
  },
  {
    value: "insurance",
    label: "Professional indemnity insurance",
    required: true,
    hint: "Certificate of currency showing active cover and expiry date.",
  },
  {
    value: "other",
    label: "Other supporting document",
    required: false,
    hint: "Anything additional compliance has asked you to provide.",
  },
];

const STATUS_LABELS: Record<KycDoc["status"], { label: string; className: string }> = {
  submitted: {
    label: "Pending review",
    className: "bg-amber-100 text-amber-700",
  },
  verified: {
    label: "Verified",
    className: "bg-emerald-100 text-emerald-700",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700",
  },
  expired: {
    label: "Expired",
    className: "bg-slate-200 text-slate-600",
  },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdvisorKycClient() {
  const [docs, setDocs] = useState<KycDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notAuthed, setNotAuthed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<string>("afsl_certificate");
  const [expiresAt, setExpiresAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/advisor-kyc", { cache: "no-store" });
      if (res.status === 401) {
        setNotAuthed(true);
        return;
      }
      if (!res.ok) {
        setError("Couldn't load your KYC documents. Try refreshing.");
        return;
      }
      const json = (await res.json()) as { items?: KycDoc[] };
      setDocs(json.items || []);
      setError(null);
    } catch {
      setError("Network error — try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Pick a file first.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("document_type", uploadType);
      if (expiresAt) {
        // Convert the date-only input into an ISO timestamp so the
        // API stores it consistently with other timestamp columns.
        fd.append("expires_at", new Date(expiresAt).toISOString());
      }

      const res = await fetch("/api/advisor-kyc", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof json.error === "string"
            ? friendlyError(json.error)
            : "Upload failed — try a different file.",
        );
        return;
      }

      setSuccessMsg("Uploaded. Compliance will review within 1 business day.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setExpiresAt("");
      await load();
    } finally {
      setUploading(false);
    }
  };

  if (notAuthed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-800">
          Sign in to the advisor portal first
        </p>
        <p className="text-xs text-amber-700 mt-1">
          You need an active advisor session to upload KYC documents.
        </p>
        <a
          href="/advisor-portal"
          className="mt-3 inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors"
        >
          Go to advisor portal →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upload form */}
      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 bg-white p-5 md:p-6"
      >
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Upload a document
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          PDF, JPG, PNG or WebP up to 10&nbsp;MB. Files are stored
          encrypted in Supabase Storage.
        </p>

        <label className="block mb-3">
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">
            Document type
          </span>
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
                {t.required ? " (required)" : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            {DOC_TYPES.find((t) => t.value === uploadType)?.hint}
          </p>
        </label>

        <label className="block mb-3">
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">
            Expiry date (optional)
          </span>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            If the certificate has an expiry, set it here — we&rsquo;ll
            remind you before it lapses.
          </p>
        </label>

        <label className="block mb-4">
          <span className="block text-xs font-semibold text-slate-700 mb-1.5">
            File
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            required
            className="w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold file:text-xs hover:file:bg-slate-800"
          />
        </label>

        <button
          type="submit"
          disabled={uploading}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          {uploading ? "Uploading…" : "Upload document"}
        </button>

        {error && (
          <p
            role="alert"
            className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2"
          >
            {error}
          </p>
        )}
        {successMsg && (
          <p
            role="status"
            className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2"
          >
            {successMsg}
          </p>
        )}
      </form>

      {/* Existing docs */}
      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3">
          Your documents
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              No documents uploaded yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {docs.map((d) => {
              const status = STATUS_LABELS[d.status];
              const typeLabel =
                DOC_TYPES.find((t) => t.value === d.document_type)?.label ||
                d.document_type;
              return (
                <li key={d.id} className="p-4">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {typeLabel}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {d.original_filename || d.storage_path.split("/").pop()}{" "}
                        · {formatBytes(d.file_size_bytes)} ·{" "}
                        {d.mime_type || "—"}
                      </p>
                    </div>
                    <span
                      className={`inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-600">
                    <div>
                      <dt className="font-semibold text-slate-500">Uploaded</dt>
                      <dd>{formatDate(d.uploaded_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Expires</dt>
                      <dd>{formatDate(d.expires_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Verified</dt>
                      <dd>{formatDate(d.verified_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Status</dt>
                      <dd>{status.label}</dd>
                    </div>
                  </dl>
                  {d.rejection_reason && (
                    <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                      <strong>Rejection reason:</strong> {d.rejection_reason}
                    </p>
                  )}
                  {d.verification_notes && (
                    <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                      <strong>Reviewer note:</strong> {d.verification_notes}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case "invalid_type":
      return "Pick a valid document type.";
    case "invalid_size":
      return "File must be between 1 byte and 10 MB.";
    case "invalid_mime":
      return "We only accept PDF, JPG, PNG and WebP files.";
    case "Too many uploads":
      return "You've uploaded a lot of documents recently — take a short break and try again.";
    case "Unauthorized":
      return "Your session expired. Sign in to the advisor portal again.";
    default:
      return "Upload failed — try a different file or contact support.";
  }
}
