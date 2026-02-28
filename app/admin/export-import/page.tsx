"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";

const EXPORT_TABLES = [
  "brokers",
  "articles",
  "scenarios",
  "quiz_weights",
  "quiz_questions",
  "calculator_config",
  "site_settings",
] as const;

type TableName = (typeof EXPORT_TABLES)[number];

interface ImportPreview {
  [table: string]: number;
}

interface ImportStatus {
  table: string;
  status: "pending" | "importing" | "done" | "error";
  count: number;
  message?: string;
}

export default function ExportImportPage() {
  const supabase = createClient();
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<Record<string, any[]> | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatuses, setImportStatuses] = useState<ImportStatus[]>([]);
  const [importComplete, setImportComplete] = useState(false);

  async function handleExport() {
    setExporting(true);
    setExportMessage(null);

    try {
      const backup: Record<string, any[]> = {};

      for (const table of EXPORT_TABLES) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) {
          console.error(`Error fetching ${table}:`, error.message);
          backup[table] = [];
        } else {
          backup[table] = data ?? [];
        }
      }

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const date = new Date().toISOString().split("T")[0];
      const filename = `invest-com-au-backup-${date}.json`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportMessage(`Exported ${filename} successfully.`);
    } catch (err: any) {
      setExportMessage(`Export failed: ${err.message}`);
    }

    setExporting(false);
    setTimeout(() => setExportMessage(null), 5000);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportData(null);
    setImportPreview(null);
    setImportStatuses([]);
    setImportComplete(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);

        if (typeof parsed !== "object" || parsed === null) {
          throw new Error("Invalid backup format");
        }

        setImportData(parsed);

        const preview: ImportPreview = {};
        for (const [table, rows] of Object.entries(parsed)) {
          if (Array.isArray(rows)) {
            preview[table] = rows.length;
          }
        }
        setImportPreview(preview);
      } catch (err: any) {
        setImportPreview(null);
        setImportData(null);
        alert(`Invalid JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!importData) return;

    setImporting(true);
    setImportComplete(false);

    const tables = Object.keys(importData).filter(
      (t) => Array.isArray(importData[t]) && importData[t].length > 0
    );

    const statuses: ImportStatus[] = tables.map((table) => ({
      table,
      status: "pending" as const,
      count: importData[table].length,
    }));
    setImportStatuses([...statuses]);

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const rows = importData[table];

      statuses[i] = { ...statuses[i], status: "importing" };
      setImportStatuses([...statuses]);

      try {
        const { error } = await supabase.from(table).upsert(rows);

        if (error) {
          statuses[i] = {
            ...statuses[i],
            status: "error",
            message: error.message,
          };
        } else {
          statuses[i] = { ...statuses[i], status: "done" };
        }
      } catch (err: any) {
        statuses[i] = {
          ...statuses[i],
          status: "error",
          message: err.message,
        };
      }

      setImportStatuses([...statuses]);
    }

    setImporting(false);
    setImportComplete(true);
  }

  function resetImport() {
    setImportFile(null);
    setImportData(null);
    setImportPreview(null);
    setImportStatuses([]);
    setImportComplete(false);
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Export / Import</h1>
          <p className="text-sm text-slate-500 mt-1">
            Backup and restore site data. Export before making bulk changes.
          </p>
        </div>

        {/* Export Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Export Data
          </h2>
          <p className="text-slate-500 text-sm mb-4">
            Download a full JSON backup of all site data including brokers,
            articles, scenarios, quiz data, calculator configs, and site
            settings.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {exporting ? "Exporting..." : "Export All Data"}
            </button>

            {exportMessage && (
              <span className="text-sm text-green-600">{exportMessage}</span>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs text-slate-500">
              Tables included:{" "}
              {EXPORT_TABLES.map((t) => (
                <span
                  key={t}
                  className="inline-block bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs mr-1 mb-1"
                >
                  {t}
                </span>
              ))}
            </p>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Import Data
          </h2>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-amber-700 text-sm font-medium">
              Warning: Importing data will overwrite existing records with
              matching IDs. This action cannot be undone.
            </p>
          </div>

          <p className="text-slate-500 text-sm mb-4">
            Upload a previously exported JSON backup file to restore data.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Select Backup File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-slate-200 file:text-slate-600
                hover:file:bg-slate-600
                file:cursor-pointer cursor-pointer"
            />
          </div>

          {/* Preview */}
          {importPreview && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-600 mb-2">
                Import Preview
              </h3>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-slate-500 font-medium">
                        Table
                      </th>
                      <th className="px-4 py-2 text-right text-slate-500 font-medium">
                        Records
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(importPreview).map(([table, count]) => (
                      <tr key={table} className="border-b border-slate-100">
                        <td className="px-4 py-2 text-slate-600">{table}</td>
                        <td className="px-4 py-2 text-right text-slate-600">
                          {count}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-white/50">
                      <td className="px-4 py-2 text-slate-900 font-medium">
                        Total
                      </td>
                      <td className="px-4 py-2 text-right text-slate-900 font-medium">
                        {Object.values(importPreview).reduce(
                          (sum, c) => sum + c,
                          0
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Status */}
          {importStatuses.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-slate-600 mb-2">
                Import Progress
              </h3>
              <div className="space-y-2">
                {importStatuses.map((status) => (
                  <div
                    key={status.table}
                    className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 text-sm">
                        {status.table}
                      </span>
                      <span className="text-slate-500 text-xs">
                        ({status.count} records)
                      </span>
                    </div>
                    <div>
                      {status.status === "pending" && (
                        <span className="text-slate-500 text-xs">Pending</span>
                      )}
                      {status.status === "importing" && (
                        <span className="text-amber-600 text-xs">
                          Importing...
                        </span>
                      )}
                      {status.status === "done" && (
                        <span className="text-green-600 text-xs">Done</span>
                      )}
                      {status.status === "error" && (
                        <span
                          className="text-red-600 text-xs"
                          title={status.message}
                        >
                          Error: {status.message}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importComplete && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              Import completed.{" "}
              {importStatuses.filter((s) => s.status === "error").length > 0
                ? `${importStatuses.filter((s) => s.status === "error").length} table(s) had errors.`
                : "All tables imported successfully."}
            </div>
          )}

          {/* Action Buttons */}
          {importPreview && !importComplete && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleImport}
                disabled={importing}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {importing ? "Importing..." : "Confirm Import"}
              </button>
              <button
                onClick={resetImport}
                disabled={importing}
                className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          )}

          {importComplete && (
            <button
              onClick={resetImport}
              className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
