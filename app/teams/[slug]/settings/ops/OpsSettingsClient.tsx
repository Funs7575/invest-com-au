"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Member {
  professional_id: number;
  name: string;
}

interface Props {
  teamSlug: string;
  initialSpecialtyTags: string[];
  initialAutoClaimMode: "manual" | "round_robin";
  initialAutoClaimMemberIds: number[];
  members: Member[];
}

const PRESET_TAGS_BY_HINT: Record<string, string[]> = {
  smsf: ["lrba", "first_smsf", "smsf_pension_phase", "smsf_property"],
  property: ["nsw_coastal", "vic_metro", "qld_regional", "commercial_strip"],
  tax: ["dual_resident", "expat_us", "expat_uk", "foreign_income"],
  business: ["mbo", "succession", "asset_only", "share_purchase"],
};

export default function OpsSettingsClient({
  teamSlug,
  initialSpecialtyTags,
  initialAutoClaimMode,
  initialAutoClaimMemberIds,
  members,
}: Props) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initialSpecialtyTags);
  const [newTag, setNewTag] = useState("");
  const [autoMode, setAutoMode] = useState(initialAutoClaimMode);
  const [autoMembers, setAutoMembers] = useState<number[]>(
    initialAutoClaimMemberIds,
  );
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "_");
    if (!t || tags.includes(t) || tags.length >= 20) return;
    setTags((p) => [...p, t]);
    setNewTag("");
  }

  function removeTag(t: string) {
    setTags((p) => p.filter((x) => x !== t));
  }

  function toggleMember(id: number) {
    setAutoMembers((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  }

  function save() {
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/teams/${teamSlug}/ops-settings`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            specialty_tags: tags,
            auto_claim_mode: autoMode,
            auto_claim_member_ids: autoMembers,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setSavedAt(Date.now());
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  // Suggest presets based on user-typed prefix.
  const presetSuggestions =
    newTag.length >= 2
      ? Object.entries(PRESET_TAGS_BY_HINT)
          .filter(([hint]) => hint.startsWith(newTag.toLowerCase().slice(0, 4)))
          .flatMap(([, ts]) => ts)
          .filter((t) => !tags.includes(t))
          .slice(0, 6)
      : [];

  return (
    <div className="space-y-8">
      {/* Specialty tags */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Specialty tags
        </h2>
        <p className="text-xs text-slate-600 mb-4">
          Finer-grained tags beyond your team category. Surfaced on the
          comparison view + match the brief routing rules. Tags are
          lowercase, underscore-separated. Up to 20.
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-violet-100 text-violet-800 rounded-full pl-2.5 pr-1.5 py-1"
              >
                {t.replace(/_/g, " ")}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="text-violet-700 hover:text-violet-900 w-4 h-4 rounded-full hover:bg-violet-200 flex items-center justify-center"
                  aria-label={`Remove ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(newTag);
              }
            }}
            placeholder="e.g. nsw_coastal, lrba, first_smsf"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => addTag(newTag)}
            disabled={!newTag.trim() || tags.length >= 20}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold px-3"
          >
            Add
          </button>
        </div>

        {presetSuggestions.length > 0 && (
          <div className="mt-2 text-xs text-slate-500">
            Suggestions:{" "}
            {presetSuggestions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addTag(t)}
                className="inline-block mr-1.5 mt-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-violet-100 text-slate-700 hover:text-violet-700"
              >
                + {t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Auto-claim mode */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Auto-claim mode
        </h2>
        <p className="text-xs text-slate-600 mb-4">
          When a brief gets accepted by your team, who picks it up? Manual
          (default) leaves it unclaimed for whoever taps Claim first.
          Round-robin auto-creates a claim for the next member in
          rotation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {(["manual", "round_robin"] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setAutoMode(m)}
              className={`text-left rounded-lg border p-3 text-sm transition-colors ${
                autoMode === m
                  ? "border-violet-500 ring-2 ring-violet-300 bg-violet-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <p className="font-semibold text-slate-900">
                {m === "manual" ? "Manual" : "Round-robin"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {m === "manual"
                  ? "Brief sits unclaimed until a member taps Claim."
                  : "Auto-assigns to the next member in your rotation pool."}
              </p>
            </button>
          ))}
        </div>

        {autoMode === "round_robin" && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
            <p className="text-xs font-semibold text-violet-900 mb-2">
              Rotation pool (auto-claim cycles through these members)
            </p>
            <div className="space-y-1">
              {members.map((m) => (
                <label
                  key={m.professional_id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={autoMembers.includes(m.professional_id)}
                    onChange={() => toggleMember(m.professional_id)}
                    className="rounded border-violet-400"
                  />
                  <span className="text-slate-800">{m.name}</span>
                </label>
              ))}
            </div>
            {autoMembers.length === 0 && (
              <p className="text-xs text-rose-700 mt-2">
                Pick at least one member, or auto-claim won&apos;t fire.
              </p>
            )}
          </div>
        )}
      </section>

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        {savedAt && (
          <p className="text-xs text-emerald-700 font-semibold">
            Saved ·{" "}
            {new Date(savedAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
