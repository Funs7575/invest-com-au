"use client";

/**
 * Three-step wizard for the owner-driven listing reverse-flow:
 *
 *   1. Kind        — property / business / syndicate / other
 *   2. Details     — title, price, location, description
 *   3. Review      — confirm + submit
 *
 * Submits via POST /api/listings/owner-flow to create a draft, then
 * POST /api/listings/owner-flow/[id]/submit to flip into pending_review.
 * The owner is redirected to /account/listings on success.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  LISTING_KINDS,
  LISTING_KIND_LABELS,
  type ListingKind,
} from "@/lib/listings/types";

type Step = 1 | 2 | 3;

interface FormState {
  kind: ListingKind | null;
  title: string;
  askingPriceAud: string; // free-text — converted to cents on submit
  locationState: string;
  description: string;
}

const INITIAL: FormState = {
  kind: null,
  title: "",
  askingPriceAud: "",
  locationState: "",
  description: "",
};

const STATE_OPTIONS = [
  { value: "", label: "Australia-wide / not specified" },
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

function priceToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100);
}

export default function ListingNewClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    setError(null);
    if (step === 1 && !form.kind) {
      setError("Pick the kind of opportunity you're listing.");
      return;
    }
    if (step === 2) {
      if (form.title.trim().length < 3) {
        setError("Give your listing a short title (at least 3 characters).");
        return;
      }
      if (form.description.trim().length < 20) {
        setError("Add a short description (at least 20 characters).");
        return;
      }
    }
    setStep((s) => (s === 1 ? 2 : 3));
  }

  function back() {
    setError(null);
    setStep((s) => (s === 3 ? 2 : 1));
  }

  async function submit() {
    if (!form.kind) return;
    setError(null);
    startTransition(async () => {
      try {
        const askingPriceCents = priceToCents(form.askingPriceAud);
        const createRes = await fetch("/api/listings/owner-flow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            kind: form.kind,
            asking_price_cents: askingPriceCents,
            currency: "AUD",
            location_state: form.locationState || null,
            description: form.description.trim(),
            payload: {},
          }),
        });
        if (createRes.status === 401) {
          router.push(
            `/account/login?redirect=${encodeURIComponent("/listings/new")}`,
          );
          return;
        }
        if (!createRes.ok) {
          const body = (await createRes.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(body.error || "Could not create listing. Please try again.");
          return;
        }
        const created = (await createRes.json()) as { id: string };

        const submitRes = await fetch(
          `/api/listings/owner-flow/${created.id}/submit`,
          { method: "POST" },
        );
        if (!submitRes.ok) {
          const body = (await submitRes.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(
            body.error
              ? `Submitted as draft, but moderation submission failed: ${body.error}`
              : "Submitted as draft, but moderation submission failed.",
          );
          // Still send to tracker so the owner sees their draft.
          router.push("/account/listings");
          return;
        }

        router.push("/account/listings?submitted=1");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unexpected error. Please try again.",
        );
      }
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
      <ol
        aria-label="Listing wizard steps"
        className="flex gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6"
      >
        {[1, 2, 3].map((s) => (
          <li
            key={s}
            aria-current={s === step ? "step" : undefined}
            className={
              s === step
                ? "px-3 py-1 rounded-full bg-amber-100 text-amber-800"
                : s < step
                  ? "px-3 py-1 rounded-full bg-emerald-50 text-emerald-700"
                  : "px-3 py-1 rounded-full bg-slate-100 text-slate-500"
            }
          >
            {s === 1 ? "1 · Kind" : s === 2 ? "2 · Details" : "3 · Review"}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            What are you listing?
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Pick the closest match. You can refine the details next.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LISTING_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => update("kind", k)}
                className={
                  form.kind === k
                    ? "border-2 border-amber-500 bg-amber-50 text-left p-4 rounded-lg"
                    : "border border-slate-200 hover:border-slate-300 text-left p-4 rounded-lg"
                }
              >
                <p className="font-bold text-slate-900">
                  {LISTING_KIND_LABELS[k]}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">
              Listing details
            </h2>
            <p className="text-sm text-slate-600">
              These will appear on the public listing page once an admin
              approves it.
            </p>
          </div>
          <div>
            <label
              htmlFor="listing-title"
              className="block text-sm font-bold text-slate-900 mb-1"
            >
              Title
            </label>
            <input
              id="listing-title"
              type="text"
              maxLength={180}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Brisbane café — 5 years trading, owner retiring"
            />
          </div>
          <div>
            <label
              htmlFor="listing-price"
              className="block text-sm font-bold text-slate-900 mb-1"
            >
              Asking price (AUD)
              <span className="font-normal text-slate-500"> · optional</span>
            </label>
            <input
              id="listing-price"
              type="text"
              inputMode="decimal"
              value={form.askingPriceAud}
              onChange={(e) => update("askingPriceAud", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. 850000"
            />
          </div>
          <div>
            <label
              htmlFor="listing-state"
              className="block text-sm font-bold text-slate-900 mb-1"
            >
              Location (state)
            </label>
            <select
              id="listing-state"
              value={form.locationState}
              onChange={(e) => update("locationState", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {STATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="listing-description"
              className="block text-sm font-bold text-slate-900 mb-1"
            >
              Description
            </label>
            <textarea
              id="listing-description"
              rows={6}
              maxLength={8000}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="What's on offer, key numbers, why now."
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900">
            Review &amp; submit
          </h2>
          <p className="text-sm text-slate-600">
            We&rsquo;ll review your listing — usually within a business day.
            Approved listings appear publicly and investors can use Get Matched
            to request more info.
          </p>
          <dl className="border border-slate-200 rounded-lg divide-y divide-slate-200 text-sm">
            <div className="flex justify-between p-3">
              <dt className="font-semibold text-slate-700">Kind</dt>
              <dd className="text-slate-900">
                {form.kind ? LISTING_KIND_LABELS[form.kind] : "—"}
              </dd>
            </div>
            <div className="flex justify-between p-3">
              <dt className="font-semibold text-slate-700">Title</dt>
              <dd className="text-slate-900 text-right max-w-md">
                {form.title || "—"}
              </dd>
            </div>
            <div className="flex justify-between p-3">
              <dt className="font-semibold text-slate-700">Asking price</dt>
              <dd className="text-slate-900">
                {form.askingPriceAud
                  ? `A$${form.askingPriceAud}`
                  : "Not disclosed"}
              </dd>
            </div>
            <div className="flex justify-between p-3">
              <dt className="font-semibold text-slate-700">Location</dt>
              <dd className="text-slate-900">
                {form.locationState || "Australia-wide"}
              </dd>
            </div>
            <div className="p-3">
              <dt className="font-semibold text-slate-700 mb-1">Description</dt>
              <dd className="text-slate-900 whitespace-pre-wrap">
                {form.description || "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2"
        >
          {error}
        </p>
      )}

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={back}
          disabled={step === 1 || pending}
          className="text-sm font-semibold text-slate-600 disabled:text-slate-300"
        >
          ← Back
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            disabled={pending}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2 rounded-lg text-sm"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit for review"}
          </button>
        )}
      </div>
    </div>
  );
}
