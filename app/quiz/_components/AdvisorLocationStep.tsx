"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";

interface PostcodeSuggestion {
  postcode: string;
  locality: string;
  state: string;
}

const STATES = [
  { value: "", label: "Select your state or territory…", disabled: true },
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

const BUDGETS = [
  { value: "", label: "Select a range (optional)…" },
  { value: "under_100k", label: "Under $100k" },
  { value: "100k_500k", label: "$100k – $500k" },
  { value: "500k_2m", label: "$500k – $2M" },
  { value: "over_2m", label: "$2M+" },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

interface Props {
  stateValue: string;
  postcodeValue: string;
  suburbValue: string;
  budgetValue: string;
  onStateChange: (v: string) => void;
  onPostcodeChange: (postcode: string, state: string, suburb: string) => void;
  onBudgetChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string;
}

export default function AdvisorLocationStep({
  stateValue, postcodeValue, suburbValue, budgetValue,
  onStateChange, onPostcodeChange, onBudgetChange, onNext, onBack, error,
}: Props) {
  const [postcodeInput, setPostcodeInput] = useState(postcodeValue);
  const [suggestions, setSuggestions] = useState<PostcodeSuggestion[]>([]);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [showStateDropdown, setShowStateDropdown] = useState(!postcodeValue && !stateValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (postcodeValue) {
      setLookupStatus("found");
      setShowStateDropdown(false);
    } else if (stateValue) {
      setShowStateDropdown(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePostcodeInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPostcodeInput(digits);

    if (!digits) {
      onPostcodeChange("", "", "");
      setSuggestions([]);
      setLookupStatus("idle");
      setShowStateDropdown(true);
      return;
    }

    setShowStateDropdown(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (digits.length < 4) {
      setSuggestions([]);
      setLookupStatus("idle");
      onPostcodeChange(digits, "", "");
      return;
    }

    setLookupStatus("loading");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/advisor-search/postcodes?q=${encodeURIComponent(digits)}`);
        const data = await res.json();
        const results: PostcodeSuggestion[] = data.postcodes ?? [];
        if (results.length > 0) {
          setSuggestions(results);
          setLookupStatus("found");
          const exact = results.find((r) => r.postcode === digits);
          const pick = exact ?? results[0];
          onPostcodeChange(pick.postcode, pick.state, pick.locality);
        } else {
          setSuggestions([]);
          setLookupStatus("notfound");
          onPostcodeChange(digits, "", "");
        }
      } catch {
        setSuggestions([]);
        setLookupStatus("notfound");
      }
    }, 400);
  };

  const handleSuggestionSelect = (s: PostcodeSuggestion) => {
    setPostcodeInput(s.postcode);
    setSuggestions([]);
    setLookupStatus("found");
    onPostcodeChange(s.postcode, s.state, s.locality);
  };

  const hasValidLocation = !!stateValue;

  return (
    <Card variant="default" padding="lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight">
          Where are you located?
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          We use this to find advisors near you.
        </p>
        {/* Video call reassurance */}
        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            Most advisors also offer <strong>video calls</strong> — location helps us prioritise local matches first, but remote consultations are always available.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* How much to invest — moved first as it's quick and friendly */}
        <div>
          <Select
            id="quiz-budget"
            label="How much are you looking to invest?"
            options={BUDGETS}
            value={budgetValue}
            onChange={(e) => onBudgetChange(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Optional — helps us match you with advisors experienced at your level
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs text-slate-400 font-medium">Your location</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {/* Postcode */}
        <div>
          <label htmlFor="quiz-postcode" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Postcode <span className="text-slate-400 font-normal">(recommended)</span>
          </label>
          <div className="relative">
            <input
              id="quiz-postcode"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={postcodeInput}
              onChange={(e) => handlePostcodeInput(e.target.value)}
              placeholder="e.g. 2000"
              className={`
                w-full px-4 py-3 border-2 rounded-xl text-slate-900 text-sm
                focus:outline-none focus:border-amber-500 transition-colors bg-white
                ${error && !postcodeInput ? "border-red-400" : "border-slate-200"}
              `}
              autoComplete="postal-code"
            />
            {lookupStatus === "loading" && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            )}
            {lookupStatus === "found" && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {lookupStatus === "found" && suburbValue && (
            <div className="mt-2 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold text-emerald-700">{suburbValue}, {stateValue}</span>
            </div>
          )}

          {suggestions.length > 1 && (
            <div className="mt-1 border border-slate-200 rounded-xl bg-white shadow-md overflow-hidden z-10">
              {suggestions.map((s) => (
                <button
                  key={`${s.postcode}-${s.locality}`}
                  type="button"
                  onClick={() => handleSuggestionSelect(s)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors border-b border-slate-100 last:border-0"
                >
                  <span className="font-medium text-slate-800">{s.locality}</span>
                  <span className="text-slate-500 ml-1.5">{s.postcode}, {s.state}</span>
                </button>
              ))}
            </div>
          )}

          {lookupStatus === "notfound" && postcodeInput.length === 4 && (
            <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Postcode not found — please select your state below
            </p>
          )}

          {lookupStatus === "idle" && !postcodeInput && (
            <button
              type="button"
              onClick={() => setShowStateDropdown(true)}
              className="mt-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              Don&apos;t know your postcode? Select state instead
            </button>
          )}
        </div>

        {/* State fallback */}
        {(showStateDropdown || lookupStatus === "notfound" || (!postcodeInput && stateValue)) && (
          <div className="pt-1">
            <Select
              id="quiz-state"
              label="State or Territory"
              required={!stateValue}
              options={STATES}
              value={stateValue}
              onChange={(e) => {
                onStateChange(e.target.value);
                if (postcodeInput && lookupStatus !== "found") {
                  setPostcodeInput("");
                  onPostcodeChange("", e.target.value, "");
                }
              }}
              error={!postcodeInput ? error : undefined}
            />
          </div>
        )}

        {error && !stateValue && !postcodeInput && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 -mt-3" role="alert">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="ghost" onClick={onBack}>&larr; Back</Button>
        <Button variant="primary" onClick={onNext} disabled={!hasValidLocation} className="flex-1">
          Find my match &rarr;
        </Button>
      </div>
    </Card>
  );
}
