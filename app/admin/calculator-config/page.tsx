"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import { CalculatorConfig } from "@/lib/types";

const CALC_TYPES = ["franking", "switching", "fx", "cgt", "chess"] as const;

const DEFAULT_CONFIGS: Record<string, Record<string, any>> = {
  franking: { corporate_tax_rate: 30 },
  switching: { transfer_fee: 0 },
  fx: {},
  cgt: { tax_brackets: [] },
  chess: {},
};

export default function CalculatorConfigPage() {
  const supabase = createClient();
  const [configs, setConfigs] = useState<Record<string, CalculatorConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, { type: "success" | "error"; text: string }>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("calculator_config")
      .select("*");

    if (!error && data) {
      const map: Record<string, CalculatorConfig> = {};
      data.forEach((row: CalculatorConfig) => {
        map[row.calc_type] = row;
      });
      setConfigs(map);
    }
    setLoading(false);
  }

  function getConfig(calcType: string): Record<string, any> {
    return configs[calcType]?.config ?? DEFAULT_CONFIGS[calcType] ?? {};
  }

  function updateConfig(calcType: string, key: string, value: any) {
    setConfigs((prev) => {
      const existing = prev[calcType];
      const currentConfig = existing?.config ?? DEFAULT_CONFIGS[calcType] ?? {};
      return {
        ...prev,
        [calcType]: {
          ...existing,
          calc_type: calcType,
          config: { ...currentConfig, [key]: value },
        } as CalculatorConfig,
      };
    });
  }

  async function saveConfig(calcType: string) {
    setSaving((prev) => ({ ...prev, [calcType]: true }));
    setMessages((prev) => ({ ...prev, [calcType]: undefined as any }));

    const config = getConfig(calcType);

    const { error } = await supabase
      .from("calculator_config")
      .upsert(
        { calc_type: calcType, config, updated_at: new Date().toISOString() },
        { onConflict: "calc_type" }
      );

    if (error) {
      setMessages((prev) => ({
        ...prev,
        [calcType]: { type: "error", text: `Error saving: ${error.message}` },
      }));
    } else {
      setMessages((prev) => ({
        ...prev,
        [calcType]: { type: "success", text: "Saved successfully" },
      }));
      fetchConfigs();
    }

    setSaving((prev) => ({ ...prev, [calcType]: false }));
    setTimeout(() => {
      setMessages((prev) => {
        const next = { ...prev };
        delete next[calcType];
        return next;
      });
    }, 3000);
  }

  function renderCalcFields(calcType: string) {
    const config = getConfig(calcType);

    switch (calcType) {
      case "franking":
        return (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Corporate Tax Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={config.corporate_tax_rate ?? ""}
              onChange={(e) =>
                updateConfig(calcType, "corporate_tax_rate", parseFloat(e.target.value) || 0)
              }
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        );

      case "switching":
        return (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Transfer Fee ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={config.transfer_fee ?? ""}
              onChange={(e) =>
                updateConfig(calcType, "transfer_fee", parseFloat(e.target.value) || 0)
              }
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        );

      case "fx":
        return (
          <div>
            <p className="text-slate-500 text-sm">
              FX calculator configuration. Add custom fields as needed in the JSON config.
            </p>
            <label className="block text-sm font-medium text-slate-600 mb-1 mt-3">
              Raw Config (JSON)
            </label>
            <textarea
              value={JSON.stringify(config, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setConfigs((prev) => ({
                    ...prev,
                    [calcType]: {
                      ...prev[calcType],
                      calc_type: calcType,
                      config: parsed,
                    } as CalculatorConfig,
                  }));
                } catch {
                  // ignore parse errors while typing
                }
              }}
              rows={5}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        );

      case "cgt":
        return (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Tax Brackets (display only)
            </label>
            {Array.isArray(config.tax_brackets) && config.tax_brackets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-300">
                      {Object.keys(config.tax_brackets[0] || {}).map((key) => (
                        <th
                          key={key}
                          className="px-3 py-2 text-slate-600 font-medium"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {config.tax_brackets.map(
                      (bracket: Record<string, any>, idx: number) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-200"
                        >
                          {Object.values(bracket).map((val, vIdx) => (
                            <td
                              key={vIdx}
                              className="px-3 py-2 text-slate-500"
                            >
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic">
                No tax brackets configured.
              </p>
            )}
          </div>
        );

      case "chess":
        return (
          <div>
            <p className="text-slate-500 text-sm">
              CHESS calculator configuration. Add custom fields as needed in the JSON config.
            </p>
            <label className="block text-sm font-medium text-slate-600 mb-1 mt-3">
              Raw Config (JSON)
            </label>
            <textarea
              value={JSON.stringify(config, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setConfigs((prev) => ({
                    ...prev,
                    [calcType]: {
                      ...prev[calcType],
                      calc_type: calcType,
                      config: parsed,
                    } as CalculatorConfig,
                  }));
                } catch {
                  // ignore parse errors while typing
                }
              }}
              rows={5}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calculator Config</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure the brokerage fee calculator parameters for each broker.
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {CALC_TYPES.map((calcType) => (
              <div
                key={calcType}
                className="bg-white border border-slate-200 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 capitalize">
                    {calcType} Calculator
                  </h2>
                </div>

                <div className="space-y-4">
                  {renderCalcFields(calcType)}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => saveConfig(calcType)}
                    disabled={saving[calcType]}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving[calcType] ? "Saving..." : "Save"}
                  </button>

                  {messages[calcType] && (
                    <span
                      className={`text-sm ${
                        messages[calcType].type === "success"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {messages[calcType].text}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
