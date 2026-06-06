"use client";

import { useState, useCallback } from "react";

const DOC_TYPES = [
  { value: "super_statement", label: "Super Statement" },
  { value: "tax_return", label: "Tax Return" },
  { value: "will", label: "Will / Estate Plan" },
  { value: "insurance_policy", label: "Insurance Policy" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "other", label: "Other" },
] as const;

type DocType = (typeof DOC_TYPES)[number]["value"];

interface Document {
  id: string;
  document_type: DocType;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  description: string | null;
  created_at: string;
  download_url: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeLabel(type: string): string {
  return DOC_TYPES.find((t) => t.value === type)?.label ?? type;
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    super_statement: "bg-blue-100 text-blue-800",
    tax_return: "bg-amber-100 text-amber-800",
    will: "bg-purple-100 text-purple-800",
    insurance_policy: "bg-green-100 text-green-800",
    bank_statement: "bg-gray-100 text-gray-800",
    other: "bg-slate-100 text-slate-700",
  };
  return map[type] ?? "bg-gray-100 text-gray-700";
}

export default function VaultClient({ initialDocs }: { initialDocs: Document[] }) {
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [showUpload, setShowUpload] = useState(false);
  const [docType, setDocType] = useState<DocType>("super_statement");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("document_type", docType);
    if (description) fd.append("description", description);

    const res = await fetch("/api/account/documents/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setUploadError((body as { error?: string }).error ?? "Upload failed");
      setUploading(false);
      return;
    }

    // Reload document list
    const listRes = await fetch("/api/account/documents");
    if (listRes.ok) {
      const { documents } = (await listRes.json()) as { documents: Document[] };
      setDocs(documents);
    }

    setFile(null);
    setDescription("");
    setDocType("super_statement");
    setShowUpload(false);
    setUploading(false);
  }, [file, docType, description]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeletingId(id);
    await fetch(`/api/account/documents/${id}`, { method: "DELETE" });
    setDocs((prev: Document[]) => prev.filter((d: Document) => d.id !== id));
    setDeletingId(null);
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Vault</h1>
          <p className="text-sm text-gray-500 mt-1">
            Securely store financial documents — encrypted at rest, private to you.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Upload document
        </button>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Upload a document</h2>

            <label className="block text-sm font-medium text-gray-700 mb-1">Document type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              File <span className="text-gray-400">(PDF, JPG, PNG — max 20 MB)</span>
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-700 mb-4 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. FY2025 ATO tax return"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
            />

            {uploadError && (
              <p className="text-sm text-red-600 mb-3">{uploadError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
              <button
                onClick={() => { setShowUpload(false); setUploadError(null); setFile(null); }}
                className="flex-1 border border-gray-300 text-sm text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document list */}
      {docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="font-medium text-gray-600">Your vault is empty</p>
          <p className="text-sm mt-1">Upload super statements, tax returns, and other key documents.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm"
            >
              <div className="text-2xl">
                {doc.mime_type === "application/pdf" ? "📄" : "🖼️"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-900 truncate">{doc.file_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(doc.document_type)}`}>
                    {typeLabel(doc.document_type)}
                  </span>
                </div>
                {doc.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{doc.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatBytes(doc.file_size_bytes)} · {new Date(doc.created_at).toLocaleDateString("en-AU")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc.download_url && (
                  <a
                    href={doc.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Download
                  </a>
                )}
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  aria-label={`Delete ${doc.file_name}`}
                  className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40 text-sm"
                >
                  {deletingId === doc.id ? "…" : "✕"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-400 mt-8 text-center">
        Documents are stored with AES-256 encryption at rest and are only accessible by you.
        invest.com.au does not access your documents.
      </p>
    </div>
  );
}
