"use client";

/**
 * 4-step Pro Squad creation wizard.
 *
 * Step 1: Basics (name + category + description)
 * Step 2: Bundled scope (multi-select Match Request templates)
 * Step 3: Invite up to 6 members (email + role)
 * Step 4: Review summary + submit
 *
 * On submit, POSTs to /api/teams/new and shows the success state with a
 * link to the new squad page.
 */

import Link from "next/link";
import { useMemo, useState } from "react";

import { BRIEF_TEMPLATES, BRIEF_TEMPLATE_LABELS } from "@/lib/briefs/templates";
import { TEAM_CATEGORIES } from "@/lib/api-schemas";
import { SQUAD_MEMBER_ROLES, type SquadMemberRole } from "@/lib/squad-creation";

type TeamCategory = (typeof TEAM_CATEGORIES)[number];

const CATEGORY_LABELS: Record<TeamCategory, string> = {
  smsf_property: "SMSF Property",
  foreign_investor: "Foreign Investor",
  expat: "Expat Investor",
  commercial_property: "Commercial Property",
  business_acquisition: "Business Acquisition",
  due_diligence: "Opportunity / Due Diligence",
  retirement: "Retirement",
  custom: "General / Custom",
};

interface InviteRow {
  email: string;
  role: SquadMemberRole;
}

interface SubmitResult {
  slug: string;
  status: "pending_review";
}

export default function TeamNewWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1
  const [name, setName] = useState("");
  const [category, setCategory] = useState<TeamCategory>("smsf_property");
  const [description, setDescription] = useState("");

  // Step 2
  const [templates, setTemplates] = useState<string[]>([]);

  // Step 3
  const [invites, setInvites] = useState<InviteRow[]>([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const step1Valid = name.trim().length >= 2 && name.length <= 80 && description.length <= 500;
  const step2Valid = templates.length >= 1;
  const step3Valid =
    invites.length <= 6 &&
    invites.every((i) => /.+@.+\..+/.test(i.email));

  const canSubmit = step1Valid && step2Valid && step3Valid && !submitting;

  function toggleTemplate(t: string): void {
    setTemplates((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function addInvite(): void {
    if (invites.length >= 6) return;
    setInvites((prev) => [...prev, { email: "", role: "specialist" }]);
  }

  function updateInvite(i: number, patch: Partial<InviteRow>): void {
    setInvites((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)),
    );
  }

  function removeInvite(i: number): void {
    setInvites((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(): Promise<void> {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/teams/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          team_category: category,
          accepted_brief_templates: templates,
          invites: invites
            .map((i) => ({ email: i.email.trim(), role: i.role }))
            .filter((i) => i.email.length > 0),
        }),
      });
      const json = (await res.json()) as
        | SubmitResult
        | { error?: string };
      if (!res.ok) {
        const msg =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Failed to create squad.";
        throw new Error(msg);
      }
      setResult(json as SubmitResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create squad.");
    } finally {
      setSubmitting(false);
    }
  }

  const summary = useMemo(
    () => ({
      name: name.trim(),
      categoryLabel: CATEGORY_LABELS[category],
      description: description.trim(),
      templates: templates.map(
        (t) => (BRIEF_TEMPLATE_LABELS as Record<string, string>)[t] ?? t,
      ),
      invites: invites.filter((i) => i.email.trim().length > 0),
    }),
    [name, category, description, templates, invites],
  );

  // Success state
  if (result) {
    return (
      <div className="bg-white border border-emerald-200 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-emerald-800 mb-2">
          Your squad is created
        </h2>
        <p className="text-slate-700 mb-4">
          Your Pro Squad is in <strong>pending</strong> verification status. Our team
          reviews new squads within 1 business day. Invited members will receive an
          email shortly.
        </p>
        <Link
          href={`/teams/${result.slug}`}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-3 rounded-xl"
        >
          View your squad →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
      <ol className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 mb-6">
        {(["Basics", "Bundled scope", "Invite members", "Review"] as const).map(
          (label, idx) => {
            const n = (idx + 1) as 1 | 2 | 3 | 4;
            const isActive = step === n;
            const isDone = step > n;
            return (
              <li
                key={label}
                className={`flex-1 border-b-2 pb-2 ${
                  isActive
                    ? "border-amber-500 text-slate-900 font-semibold"
                    : isDone
                      ? "border-emerald-500 text-emerald-700"
                      : "border-slate-200"
                }`}
              >
                {n}. {label}
              </li>
            );
          },
        )}
      </ol>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Squad name</span>
            <input
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. SMSF Property Specialists Sydney"
            />
            <span className="text-xs text-slate-500">{name.length}/80</span>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TeamCategory)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {TEAM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              One-paragraph description
            </span>
            <textarea
              value={description}
              maxLength={500}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Who you help, your team's combined experience, what makes this squad different."
            />
            <span className="text-xs text-slate-500">{description.length}/500</span>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Match Requests matching your selected templates will route to this squad.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BRIEF_TEMPLATES.map((t) => {
              const checked = templates.includes(t);
              return (
                <label
                  key={t}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer ${
                    checked
                      ? "bg-amber-50 border-amber-300"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTemplate(t)}
                  />
                  <span>
                    {(BRIEF_TEMPLATE_LABELS as Record<string, string>)[t] ?? t}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            You&rsquo;re automatically the squad <strong>lead</strong>. Invite up to 6 more.
            Invitees already on Invest.com.au join immediately as pending members.
            New emails receive a sign-up invitation.
          </p>
          {invites.map((inv, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                value={inv.email}
                onChange={(e) => updateInvite(idx, { email: e.target.value })}
                placeholder="colleague@firm.com.au"
                className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={inv.role}
                onChange={(e) =>
                  updateInvite(idx, { role: e.target.value as SquadMemberRole })
                }
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {SQUAD_MEMBER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeInvite(idx)}
                className="text-xs text-slate-500 underline"
              >
                Remove
              </button>
            </div>
          ))}
          {invites.length < 6 && (
            <button
              type="button"
              onClick={addInvite}
              className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-lg"
            >
              + Add invite
            </button>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Basics</p>
            <p className="font-semibold text-slate-900">{summary.name}</p>
            <p className="text-slate-600">{summary.categoryLabel}</p>
            {summary.description && (
              <p className="text-slate-600 mt-1">{summary.description}</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Bundled scope
            </p>
            <ul className="list-disc ml-5 text-slate-700">
              {summary.templates.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">
              Invites ({summary.invites.length})
            </p>
            {summary.invites.length === 0 ? (
              <p className="text-slate-500">No additional invites &mdash; you&rsquo;ll be the only member to start.</p>
            ) : (
              <ul className="list-disc ml-5 text-slate-700">
                {summary.invites.map((i, idx) => (
                  <li key={idx}>
                    {i.email} — <em>{i.role}</em>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs">
            Submitting will create your squad in <strong>pending</strong> verification.
            Our team reviews new squads within 1 business day.
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-200">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
          className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-40"
        >
          ← Back
        </button>
        {step < 4 ? (
          <button
            type="button"
            disabled={
              (step === 1 && !step1Valid) ||
              (step === 2 && !step2Valid) ||
              (step === 3 && !step3Valid)
            }
            onClick={() => setStep((s) => ((s + 1) as 1 | 2 | 3 | 4))}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-bold px-5 py-2 rounded-lg text-sm"
          >
            {submitting ? "Submitting…" : "Submit for verification"}
          </button>
        )}
      </div>
    </div>
  );
}
