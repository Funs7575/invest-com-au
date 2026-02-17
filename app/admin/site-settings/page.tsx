"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import { SiteSettings } from "@/lib/types";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number";
}

const SETTING_FIELDS: SettingField[] = [
  { key: "site_title", label: "Site Title", type: "text" },
  { key: "meta_description", label: "Meta Description", type: "textarea" },
  { key: "abn", label: "ABN", type: "text" },
  { key: "contact_email", label: "Contact Email", type: "text" },
  { key: "visitor_count", label: "Visitor Count", type: "number" },
  { key: "user_rating", label: "User Rating", type: "number" },
  { key: "media_logos", label: "Media Logos (comma-separated)", type: "text" },
  { key: "hero_headline", label: "Hero Headline", type: "text" },
  { key: "hero_subtitle", label: "Hero Subtitle", type: "text" },
];

export default function SiteSettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_settings")
      .select("*");

    if (!error && data) {
      const map: Record<string, string> = {};
      data.forEach((row: SiteSettings) => {
        map[row.key] = row.value ?? "";
      });
      setSettings(map);
    }
    setLoading(false);
  }

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAll() {
    setSaving(true);
    setMessage(null);

    const rows = SETTING_FIELDS.map((field) => ({
      key: field.key,
      value: settings[field.key] ?? "",
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("site_settings")
      .upsert(rows, { onConflict: "key" });

    if (error) {
      setMessage({ type: "error", text: `Error saving: ${error.message}` });
    } else {
      setMessage({ type: "success", text: "All settings saved successfully" });
      fetchSettings();
    }

    setSaving(false);
    setTimeout(() => setMessage(null), 4000);
  }

  function renderField(field: SettingField) {
    const value = settings[field.key] ?? "";

    if (field.type === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(e) => updateSetting(field.key, e.target.value)}
          rows={3}
          className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
        />
      );
    }

    return (
      <input
        type={field.type}
        value={value}
        onChange={(e) => updateSetting(field.key, e.target.value)}
        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
      />
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Site Settings</h1>
            <p className="text-slate-500 mt-1">
              Manage global site configuration and metadata.
            </p>
          </div>
          <button
            onClick={saveAll}
            disabled={saving || loading}
            className="bg-amber-500 hover:bg-green-700 text-black font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>

        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-900/50 border border-green-700 text-green-300"
                : "bg-red-900/50 border border-red-700 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-slate-500">Loading settings...</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SETTING_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className={
                    field.type === "textarea"
                      ? "md:col-span-2"
                      : ""
                  }
                >
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {field.label}
                  </label>
                  {renderField(field)}
                  <p className="text-xs text-slate-500 mt-1">
                    Key: {field.key}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-3">
              <button
                onClick={saveAll}
                disabled={saving}
                className="bg-amber-500 hover:bg-green-700 text-black font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save All"}
              </button>

              {message && (
                <span
                  className={`text-sm ${
                    message.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {message.text}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
