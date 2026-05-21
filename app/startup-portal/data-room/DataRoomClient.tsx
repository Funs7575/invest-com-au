"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type DataRoomFile = {
  id: string;
  filename: string;
  category: string;
  requires_wholesale_cert: boolean;
  uploaded_at: string;
  download_url?: string | null;
  active_grants?: number;
};

type Inquiry = {
  id: string;
  investor_user_id: string;
  status: string;
  created_at: string;
};

type Profile = {
  id: string;
  company_name: string;
  status: string;
};

const CATEGORIES = [
  { value: "pitch_deck", label: "Pitch Deck" },
  { value: "financials", label: "Financials" },
  { value: "cap_table", label: "Cap Table" },
  { value: "legal", label: "Legal" },
  { value: "product_demo", label: "Product Demo" },
  { value: "other", label: "Other" },
] as const;

const NAV = [
  { href: "/startup-portal", label: "Dashboard" },
  { href: "/startup-portal/round", label: "Round" },
  { href: "/startup-portal/data-room", label: "Data Room", active: true },
  { href: "/startup-portal/investors", label: "Investors" },
  { href: "/startup-portal/profile", label: "Profile" },
];

function categoryLabel(c: string) {
  return CATEGORIES.find((cat) => cat.value === c)?.label ?? c;
}

export default function DataRoomClient({
  profile,
  initialFiles,
  inquiries,
}: {
  profile: Profile;
  initialFiles: DataRoomFile[];
  inquiries: Inquiry[];
}) {
  const [files, setFiles] = useState<DataRoomFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [grantingFile, setGrantingFile] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("pitch_deck");
  const [requiresCert, setRequiresCert] = useState(true);

  async function refreshFiles() {
    const res = await fetch("/api/startups/data-room");
    const json = await res.json().catch(() => ({ files: [] }));
    setFiles((json as { files: DataRoomFile[] }).files ?? []);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const fileInput = fileRef.current;
    if (!fileInput?.files?.[0]) return;
    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("file", fileInput.files[0]);
    fd.append("category", category);
    fd.append("requires_wholesale_cert", String(requiresCert));

    const res = await fetch("/api/startups/data-room", { method: "POST", body: fd });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setUploadError((json as { error?: string }).error ?? "Upload failed");
    } else {
      await refreshFiles();
      setShowUpload(false);
      if (fileRef.current) fileRef.current.value = "";
    }
    setUploading(false);
  }

  async function handleGrant(fileId: string, inquiryId: string) {
    setActionError(null);
    const res = await fetch("/api/startups/data-room/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId, inquiry_id: inquiryId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setActionError((json as { error?: string }).error ?? "Grant failed");
    } else {
      await refreshFiles();
      setGrantingFile(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">invest.com.au</Link>
            <h1 className="text-lg font-semibold text-gray-900 mt-0.5">{profile.company_name}</h1>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-1 pb-0">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                n.active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Data Room</h2>
          <button
            onClick={() => { setShowUpload(true); setUploadError(null); }}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Upload file
          </button>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{actionError}</div>
        )}

        {/* Upload modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Upload document</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    File <span className="font-normal text-gray-400">(PDF, JPG, PNG, WebP — max 50 MB)</span>
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    required
                    className="mt-1 w-full text-sm text-gray-700"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresCert}
                    onChange={(e) => setRequiresCert(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Requires wholesale investor certification (s708)</span>
                </label>
                {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowUpload(false); setUploadError(null); }}
                    className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* File list */}
        {files.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-gray-600 font-medium mb-2">No files yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Upload a pitch deck, financials, or cap table to share with investors.
            </p>
            <button
              onClick={() => { setShowUpload(true); setUploadError(null); }}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Upload first file
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {files.map((f) => (
              <div key={f.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 truncate">{f.filename}</span>
                      {f.requires_wholesale_cert && (
                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          s708 required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {categoryLabel(f.category)}
                      {" · "}
                      {new Date(f.uploaded_at).toLocaleDateString("en-AU")}
                      {" · "}
                      {f.active_grants ?? 0} active grant{(f.active_grants ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {f.download_url && (
                      <a
                        href={f.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Download
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setGrantingFile(grantingFile === f.id ? null : f.id);
                        setActionError(null);
                      }}
                      className="text-xs text-emerald-700 hover:underline font-medium"
                    >
                      Grant access
                    </button>
                  </div>
                </div>

                {grantingFile === f.id && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3">
                    {inquiries.length === 0 ? (
                      <p className="text-xs text-gray-400">No pending or accepted inquiries to grant access to.</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-700">Grant access to an inquiry:</p>
                        {inquiries.map((inq) => (
                          <div key={inq.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              Inquiry {inq.id.slice(0, 8)}…
                              {" · "}
                              {new Date(inq.created_at).toLocaleDateString("en-AU")}
                              {" · "}
                              <span className="capitalize">{inq.status}</span>
                            </span>
                            <button
                              onClick={() => handleGrant(f.id, inq.id)}
                              className="text-emerald-700 hover:underline font-medium ml-4"
                            >
                              Grant
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">
          Files are accessible only to investors you explicitly grant access to.
          Files marked &apos;s708 required&apos; are only accessible to investors with a verified wholesale investor
          certification.
        </p>
      </main>
    </div>
  );
}
