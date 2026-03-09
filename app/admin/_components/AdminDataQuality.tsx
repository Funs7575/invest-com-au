"use client";

import Link from "next/link";

interface DataWarning {
  severity: "error" | "warning" | "info";
  icon: string;
  title: string;
  items: string[];
  href: string;
  actionLabel: string;
}

interface Props {
  dataWarnings: DataWarning[];
}

export default function AdminDataQuality({ dataWarnings }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Data Quality</h2>
          <p className="text-xs text-slate-500">{dataWarnings.length} issue{dataWarnings.length !== 1 ? "s" : ""} found</p>
        </div>
        <div className="flex items-center gap-1.5">
          {dataWarnings.filter(w => w.severity === "error").length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold bg-red-50 text-red-700">
              {dataWarnings.filter(w => w.severity === "error").length} error{dataWarnings.filter(w => w.severity === "error").length !== 1 ? "s" : ""}
            </span>
          )}
          {dataWarnings.filter(w => w.severity === "warning").length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold bg-amber-50 text-amber-700">
              {dataWarnings.filter(w => w.severity === "warning").length} warning{dataWarnings.filter(w => w.severity === "warning").length !== 1 ? "s" : ""}
            </span>
          )}
          {dataWarnings.filter(w => w.severity === "info").length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-semibold bg-blue-50 text-blue-700">
              {dataWarnings.filter(w => w.severity === "info").length} info
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {dataWarnings.map((w, i) => (
          <div
            key={i}
            className={`rounded-lg p-3 border ${
              w.severity === "error" ? "bg-red-50 border-red-200" :
              w.severity === "warning" ? "bg-amber-50 border-amber-200" :
              "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="text-sm">{w.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  w.severity === "error" ? "text-red-800" :
                  w.severity === "warning" ? "text-amber-800" :
                  "text-blue-800"
                }`}>{w.title}</div>
                {w.items.length > 0 && (
                  <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {w.items.join(", ")}
                  </div>
                )}
              </div>
            </div>
            <Link
              href={w.href}
              className={`text-xs font-semibold mt-2 inline-block ${
                w.severity === "error" ? "text-red-600 hover:text-red-700" :
                w.severity === "warning" ? "text-amber-600 hover:text-amber-700" :
                "text-blue-600 hover:text-blue-700"
              }`}
            >
              {w.actionLabel} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
