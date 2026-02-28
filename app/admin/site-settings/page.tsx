"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import { SiteSettings } from "@/lib/types";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number";
  hint?: string;
}

const SETTING_FIELDS: SettingField[] = [
  { key: "site_title", label: "Site Title", type: "text", hint: "Shown in browser tabs and as the default page title." },
  { key: "meta_description", label: "Meta Description", type: "textarea", hint: "Default meta description for pages without their own." },
  { key: "acn", label: "ACN", type: "text" },
  { key: "abn", label: "ABN", type: "text" },
  { key: "contact_email", label: "Contact Email", type: "text" },
  { key: "visitor_count", label: "Visitor Count", type: "number", hint: "Trust signal shown on the homepage — set manually." },
  { key: "user_rating", label: "User Rating", type: "number", hint: "Trust signal shown on the homepage — set manually." },
  { key: "media_logos", label: "Media Logos (comma-separated)", type: "text", hint: "Comma-separated image URLs for the 'As seen in' section." },
  { key: "hero_headline", label: "Hero Headline", type: "text", hint: "Main heading on the homepage hero section." },
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
          className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      );
    }

    return (
      <input
        type={field.type}
        value={value}
        onChange={(e) => updateSetting(field.key, e.target.value)}
        className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Site Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Global configuration — SEO defaults, homepage content, and trust signals.
            </p>
          </div>
          <button
            onClick={saveAll}
            disabled={saving || loading}
            className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>

        {message && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-10 w-full bg-slate-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
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
                  {field.hint && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {field.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-3">
              <button
                onClick={saveAll}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 text-black font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
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
