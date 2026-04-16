"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExportRequest {
  id: number;
  status: string;
  requested_at: string;
  fulfilled_at: string | null;
  expires_at: string | null;
  download_url: string | null;
}

interface DeletionRequest {
  id: number;
  status: string;
  requested_at: string;
  scheduled_purge_at: string;
  cancelled_at: string | null;
}

interface Props {
  email: string;
  latestExport: ExportRequest | null;
  latestDeletion: DeletionRequest | null;
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function PrivacyClient({
  email,
  latestExport,
  latestDeletion,
}: Props) {
  const router = useRouter();
  const [exportBusy, setExportBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportPending =
    latestExport &&
    (latestExport.status === "pending" || latestExport.status === "processing");
  const exportReady =
    latestExport && latestExport.status === "ready" && latestExport.download_url;
  const deletionScheduled =
    latestDeletion && latestDeletion.status === "scheduled";

  async function requestExport() {
    setError(null);
    setExportMessage(null);
    setExportBusy(true);
    try {
      const res = await fetch("/api/account/export-data", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
      } else {
        setExportMessage(data.message ?? "Export requested.");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setExportBusy(false);
    }
  }

  async function requestDeletion() {
    setError(null);
    setDeleteMessage(null);

    const confirmed = window.confirm(
      "This will schedule your account for permanent deletion in 30 days. " +
        "All your data — bookmarks, saved comparisons, quiz history, forum posts — " +
        "will be erased and cannot be recovered. " +
        "You can cancel this any time during the 30-day grace period.\n\n" +
        "Are you sure you want to delete your account?"
    );
    if (!confirmed) return;

    setDeleteBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
      } else {
        setDeleteMessage(data.message ?? "Deletion scheduled.");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function cancelDeletion() {
    setError(null);
    setDeleteMessage(null);
    setCancelBusy(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
      } else {
        setDeleteMessage(data.message ?? "Deletion cancelled.");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Email banner — confirms which account these actions apply to */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
        Signed in as{" "}
        <code className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px]">
          {email}
        </code>
        . All actions on this page apply to this account only.
      </div>

      {/* Global error banner */}
      {error && (
        <div
          role="alert"
          className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* Export */}
      <section
        aria-labelledby="export-heading"
        className="bg-white border border-slate-200 rounded-xl p-5"
      >
        <h2
          id="export-heading"
          className="text-base font-extrabold text-slate-900 mb-1"
        >
          Export your data
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          We&apos;ll assemble a JSON bundle containing every row linked to
          your account — profile, bookmarks, saved comparisons, quiz
          history, forum posts, lead enquiries, reviews. The file is
          delivered via a secure download link emailed to{" "}
          <strong>{email}</strong> within 30 days, as required under the
          Australian Privacy Principles.
        </p>

        {exportReady ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-emerald-900 mb-1">
              Your export is ready
            </p>
            <p className="text-xs text-emerald-800 mb-3">
              Requested {formatDate(latestExport?.requested_at)} ·
              {latestExport?.expires_at
                ? ` expires ${formatDate(latestExport.expires_at)}`
                : " expires in 30 days"}
            </p>
            <a
              href={latestExport?.download_url ?? "#"}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-lg"
            >
              Download your data (.json)
            </a>
          </div>
        ) : exportPending ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-900">
            Your most recent export is{" "}
            <strong>{latestExport?.status}</strong> (requested{" "}
            {formatDate(latestExport?.requested_at)}). We&apos;ll email
            you when the file is ready.
          </div>
        ) : null}

        {exportMessage && (
          <div
            role="status"
            className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 mb-4"
          >
            {exportMessage}
          </div>
        )}

        <button
          type="button"
          onClick={requestExport}
          disabled={exportBusy || !!exportPending}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportBusy
            ? "Requesting…"
            : exportPending
              ? "Export in progress"
              : "Request data export"}
        </button>

        {exportPending && (
          <p className="text-xs text-slate-500 mt-2">
            You can request a new export 24 hours after your most recent
            request.
          </p>
        )}
      </section>

      {/* Deletion */}
      <section
        aria-labelledby="delete-heading"
        className="bg-white border border-red-200 rounded-xl p-5"
      >
        <h2
          id="delete-heading"
          className="text-base font-extrabold text-red-900 mb-1"
        >
          Delete your account
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          We&apos;ll schedule your account for permanent deletion after a
          30-day grace period. During the grace period you can cancel by
          signing in and clicking <em>Cancel deletion</em> below. After
          the 30 days, all your data is erased and cannot be recovered.
          Operational records (lead disputes, reviews linked to broker
          pages) are anonymised, not deleted.
        </p>

        {deletionScheduled ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-red-900 mb-1">
              Deletion scheduled
            </p>
            <p className="text-xs text-red-800 mb-3">
              Your account will be permanently deleted on{" "}
              <strong>
                {formatDate(latestDeletion?.scheduled_purge_at)}
              </strong>
              . Cancel any time before then.
            </p>
            <button
              type="button"
              onClick={cancelDeletion}
              disabled={cancelBusy}
              className="px-4 py-2 rounded-lg bg-white border border-red-300 text-red-800 font-semibold text-sm hover:bg-red-50 disabled:opacity-50"
            >
              {cancelBusy ? "Cancelling…" : "Cancel deletion"}
            </button>
          </div>
        ) : null}

        {deleteMessage && (
          <div
            role="status"
            className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 mb-4"
          >
            {deleteMessage}
          </div>
        )}

        {!deletionScheduled && (
          <button
            type="button"
            onClick={requestDeletion}
            disabled={deleteBusy}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {deleteBusy ? "Scheduling…" : "Delete my account"}
          </button>
        )}
      </section>
    </div>
  );
}
