"use client";

import { useState } from "react";

interface TmdItem {
  id: number;
  product_type: string;
  product_ref: string;
  product_name: string;
  tmd_url: string;
  tmd_version: string;
  reviewed_at: string | null;
  valid_from: string;
  valid_until: string | null;
}

interface Props {
  initialItems: TmdItem[];
}

const PRODUCT_TYPES = ["broker", "advisor", "fund"] as const;

export default function TmdAdminClient({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [productType, setProductType] = useState<(typeof PRODUCT_TYPES)[number]>(
    "broker",
  );
  const [productRef, setProductRef] = useState("");
  const [productName, setProductName] = useState("");
  const [tmdUrl, setTmdUrl] = useState("");
  const [tmdVersion, setTmdVersion] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/tmds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_type: productType,
          product_ref: productRef,
          product_name: productName,
          tmd_url: tmdUrl,
          tmd_version: tmdVersion,
          reviewed_at: new Date().toISOString(),
          valid_until: validUntil || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Upsert failed");
        return;
      }
      setSuccess("TMD saved.");
      // Reload the list
      const listRes = await fetch("/api/admin/tmds", { cache: "no-store" });
      if (listRes.ok) {
        const data = await listRes.json();
        setItems(data.items || []);
      }
      setProductRef("");
      setProductName("");
      setTmdUrl("");
      setTmdVersion("");
      setValidUntil("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form
        onSubmit={submit}
        className="mb-8 rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Add / update TMD
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-600 mb-1">
              Product type
            </span>
            <select
              value={productType}
              onChange={(e) =>
                setProductType(e.target.value as (typeof PRODUCT_TYPES)[number])
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-600 mb-1">
              Product ref (slug or id)
            </span>
            <input
              required
              value={productRef}
              onChange={(e) => setProductRef(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. stake"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-xs font-semibold text-slate-600 mb-1">
              Product name
            </span>
            <input
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Stake Trading"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-xs font-semibold text-slate-600 mb-1">
              TMD URL
            </span>
            <input
              required
              type="url"
              value={tmdUrl}
              onChange={(e) => setTmdUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="https://…/target-market-determination.pdf"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-600 mb-1">
              Version
            </span>
            <input
              required
              value={tmdVersion}
              onChange={(e) => setTmdVersion(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="v3.1"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-600 mb-1">
              Valid until (optional)
            </span>
            <input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-xs text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mt-3 text-xs text-emerald-700">
            {success}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg"
        >
          {busy ? "Saving…" : "Save TMD"}
        </button>
      </form>

      <h2 className="text-base font-bold text-slate-900 mb-3">
        All TMDs ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No TMDs on file yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-left px-3 py-2">Version</th>
                <th className="text-left px-3 py-2">Valid from</th>
                <th className="text-left px-3 py-2">Valid until</th>
                <th className="text-left px-3 py-2">Link</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const expired =
                  t.valid_until && new Date(t.valid_until) < new Date();
                return (
                  <tr
                    key={t.id}
                    className={`border-t border-slate-100 ${
                      expired ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-3 py-2 capitalize text-slate-700">
                      {t.product_type}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {t.product_name}{" "}
                      <span className="text-slate-400 font-normal">
                        ({t.product_ref})
                      </span>
                    </td>
                    <td className="px-3 py-2">{t.tmd_version}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {t.valid_from.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {t.valid_until ? t.valid_until.slice(0, 10) : "—"}
                      {expired && (
                        <span className="ml-2 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                          expired
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={t.tmd_url}
                        target="_blank"
                        rel="noopener"
                        className="text-primary hover:underline"
                      >
                        open →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
