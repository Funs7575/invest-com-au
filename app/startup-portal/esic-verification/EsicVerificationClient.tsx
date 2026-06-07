"use client";

import { useState, useRef } from "react";

type VerificationRecord = {
  id: string;
  outcome: string;
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
};

type Props = {
  existing: VerificationRecord | null;
  esicVerifiedAt: string | null;
};

type SubmissionMethod = "file" | "ato_register";

export default function EsicVerificationClient({ existing, esicVerifiedAt }: Props) {
  const [method, setMethod] = useState<SubmissionMethod>("file");
  const [file, setFile] = useState<File | null>(null);
  const [entityName, setEntityName] = useState("");
  const [abn, setAbn] = useState("");
  const [esicRegDate, setEsicRegDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pendingVerification = existing?.outcome === "pending";
  const rejectedVerification = existing?.outcome === "rejected";
  const canSubmit = !esicVerifiedAt && !pendingVerification;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (method === "file" && !file) {
      setError("Please select a document to upload.");
      return;
    }
    if (method === "ato_register" && (!entityName.trim() || !abn.trim() || !esicRegDate.trim())) {
      setError("Entity name, ABN, and ESIC registration date are all required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const fd = new FormData();

    if (method === "file" && file) {
      fd.append("evidence_doc", file);
    } else {
      fd.append(
        "ato_register_check",
        JSON.stringify({
          entity_name: entityName.trim(),
          abn: abn.trim().replace(/\s/g, ""),
          esic_registration_date: esicRegDate.trim(),
        }),
      );
    }

    try {
      const res = await fetch("/api/startups/esic-verify", { method: "POST", body: fd });
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
        <h2 className="text-lg font-bold text-emerald-900 mb-2">Verification submitted</h2>
        <p className="text-sm text-emerald-800">
          Your ESIC eligibility evidence has been received. Our team will review it within 1–2 business days.
          Once approved, an ESIC-eligible badge will appear on your startup profile and all open rounds.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Current status */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">ESIC verification status</h2>

        {esicVerifiedAt && (
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-emerald-700">ESIC Eligible — Verified</p>
              <p className="text-xs text-gray-500">
                Verified {new Date(esicVerifiedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        )}

        {!esicVerifiedAt && pendingVerification && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Under review</p>
              <p className="text-xs text-gray-500">
                Submitted {new Date(existing!.created_at).toLocaleDateString("en-AU")} · typically reviewed within 1–2 business days
              </p>
            </div>
          </div>
        )}

        {!esicVerifiedAt && rejectedVerification && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">Verification not approved</p>
            </div>
            {existing?.notes && (
              <p className="text-xs text-red-700 ml-4">Admin note: {existing.notes}</p>
            )}
            <p className="text-xs text-gray-500 ml-4">Please resubmit with corrected documentation below.</p>
          </div>
        )}

        {!esicVerifiedAt && !existing && (
          <p className="text-sm text-gray-500">No verification submitted yet.</p>
        )}
      </div>

      {/* Submission form — shown when can submit */}
      {canSubmit && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700">
            {rejectedVerification ? "Resubmit ESIC verification" : "Submit ESIC verification"}
          </h2>

          {/* Method selection */}
          <div>
            <p className="block text-xs font-semibold text-gray-600 mb-2">Evidence type</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-colors">
                <input
                  type="radio"
                  name="method"
                  value="file"
                  checked={method === "file"}
                  onChange={() => setMethod("file")}
                />
                <div>
                  <div className="text-xs font-medium text-gray-800">Upload document</div>
                  <div className="text-[11px] text-gray-500">ATO qualification letter / ESIC register extract</div>
                </div>
              </label>
              <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-colors">
                <input
                  type="radio"
                  name="method"
                  value="ato_register"
                  checked={method === "ato_register"}
                  onChange={() => setMethod("ato_register")}
                />
                <div>
                  <div className="text-xs font-medium text-gray-800">ATO register details</div>
                  <div className="text-[11px] text-gray-500">Entity name, ABN, registration date</div>
                </div>
              </label>
            </div>
          </div>

          {method === "file" && (
            <div>
              <p className="block text-xs font-semibold text-gray-600 mb-2">
                ESIC evidence document
                <span className="text-gray-400 font-normal ml-1">(PDF, JPG, or PNG · max 10 MB)</span>
              </p>
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                ) : (
                  <p className="text-sm text-gray-400">Click to upload</p>
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
          )}

          {method === "ato_register" && (
            <div className="space-y-3">
              <div>
                <label htmlFor="esic-entity-name" className="block text-xs font-semibold text-gray-600 mb-1">Entity name</label>
                <input
                  id="esic-entity-name"
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="Your startup&apos;s legal entity name on the ATO ESIC register"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label htmlFor="esic-abn" className="block text-xs font-semibold text-gray-600 mb-1">ABN</label>
                <input
                  id="esic-abn"
                  type="text"
                  value={abn}
                  onChange={(e) => setAbn(e.target.value)}
                  placeholder="12 345 678 901"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label htmlFor="esic-reg-date" className="block text-xs font-semibold text-gray-600 mb-1">ESIC registration date</label>
                <input
                  id="esic-reg-date"
                  type="date"
                  value={esicRegDate}
                  onChange={(e) => setEsicRegDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-gray-600 mb-1">What is ESIC?</p>
            <p>
              An Early Stage Innovation Company (ESIC) status qualifies investors for a 20% non-refundable
              tax offset (up to $200K/yr) and CGT exemption on gains. The ATO determines ESIC eligibility;
              Invest.com.au displays the badge based on your attestation and admin review —
              we do not guarantee or provide tax advice on ESIC eligibility.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      )}

      {/* Guidance */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-blue-800 mb-2">Acceptable ESIC evidence</h3>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>ATO letter confirming ESIC qualification (Div 360 test result)</li>
          <li>Screenshot or PDF of the ATO Early Stage Innovation Company register listing showing your ABN</li>
          <li>Completed and signed ESIC qualification certificate from a qualified tax adviser</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          The ATO&apos;s ESIC register:{" "}
          <a
            href="https://www.ato.gov.au/businesses-and-organisations/income-deductions-offsets-and-records/tax-offsets-and-credits/early-stage-innovation-company-esic-tax-incentives"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            ato.gov.au/esic
          </a>
        </p>
      </div>
    </div>
  );
}
