"use client";

import { useMemo, useState } from "react";

import Icon from "@/components/Icon";
import { Badge } from "@/components/ui/Badge";
import SearchInput from "@/components/directory/SearchInput";
import { cn } from "@/lib/utils";
import {
  INTENT_GROUPS,
  intentsForGroup,
  searchIntents,
  type IntentDef,
  type IntentGroup,
} from "@/lib/briefs/intent-catalog";

/**
 * The Brief Studio intent gallery. A warm, searchable entry point that maps
 * every consumer journey (the quiz goals, "find a mortgage broker", "FIRB
 * help", "second opinion") onto a canonical brief_template. The freeform
 * hero is a first-class path — it drives the AI co-pilot when enabled and
 * gracefully seeds a general brief when not.
 */

type GroupFilter = "all" | IntentGroup;

export interface IntentPickerProps {
  selectedIntentId: string | null;
  onSelect: (intent: IntentDef) => void;
  onFreeform: () => void;
  aiEnabled: boolean;
  className?: string;
}

function IntentCard({
  intent,
  selected,
  onSelect,
}: {
  intent: IntentDef;
  selected: boolean;
  onSelect: (intent: IntentDef) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(intent)}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        selected
          ? "border-amber-500 ring-2 ring-amber-300 bg-amber-50"
          : "border-slate-200 hover:border-slate-300 bg-white",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          selected
            ? "bg-amber-500 text-slate-900"
            : "bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-700",
        )}
        aria-hidden="true"
      >
        <Icon name={intent.icon} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-slate-900">{intent.label}</span>
          {intent.popular && (
            <Badge variant="gold" size="sm" className="shrink-0">
              Popular
            </Badge>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500">
          {intent.tagline}
        </span>
      </span>
      {selected && (
        <Icon
          name="check-circle"
          size={18}
          className="absolute right-3 top-3 text-amber-600"
        />
      )}
    </button>
  );
}

export default function IntentPicker({
  selectedIntentId,
  onSelect,
  onFreeform,
  aiEnabled,
  className = "",
}: IntentPickerProps) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupFilter>("all");

  const searching = query.trim().length > 0;
  const results = useMemo(() => (searching ? searchIntents(query) : []), [query, searching]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Freeform hero — the first-class "describe it in your words" path */}
      <button
        type="button"
        onClick={onFreeform}
        className="group flex w-full items-center gap-3 rounded-xl border border-slate-900 bg-slate-900 p-3 text-left text-white transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:p-3.5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-900">
          <Icon name={aiEnabled ? "zap" : "edit-3"} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-bold">
              Describe it in your own words
            </span>
            {aiEnabled && (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-900">
                AI
              </span>
            )}
          </span>
          <span className="mt-0.5 line-clamp-1 block text-xs leading-snug text-slate-300">
            {aiEnabled
              ? "Plain English — our co-pilot drafts a structured brief you can review."
              : "Plain English — we'll set up the right brief for you."}
          </span>
        </span>
        <Icon
          name="arrow-right"
          size={18}
          className="shrink-0 text-amber-400 transition-transform group-hover:translate-x-1"
        />
      </button>

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium text-slate-500">or pick what you need</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Search */}
      <SearchInput
        id="intent-search"
        value={query}
        onChange={setQuery}
        placeholder="Search — try 'refinance', 'SMSF', 'FIRB', 'sell my business'…"
        ariaLabel="Search for what you need help with"
        className="!flex-none"
      />

      {/* Group filter chips (hidden while searching — search spans all groups) */}
      {!searching && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <GroupChip
            label="All"
            icon="grid"
            active={group === "all"}
            onClick={() => setGroup("all")}
          />
          {INTENT_GROUPS.map((g) => (
            <GroupChip
              key={g.id}
              label={g.label}
              icon={g.icon}
              active={group === g.id}
              onClick={() => setGroup(g.id)}
            />
          ))}
        </div>
      )}

      {/* Results */}
      {searching ? (
        results.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {results.map((intent) => (
              <IntentCard
                key={intent.id}
                intent={intent}
                selected={selectedIntentId === intent.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No exact match for “{query.trim()}”
            </p>
            <p className="mt-1 text-xs text-slate-500">
              No problem — use{" "}
              <button
                type="button"
                onClick={onFreeform}
                className="font-semibold text-amber-700 underline hover:text-amber-900"
              >
                describe it in your own words
              </button>{" "}
              and we&apos;ll route it to the right pros.
            </p>
          </div>
        )
      ) : group === "all" ? (
        <div className="space-y-4">
          {INTENT_GROUPS.map((g) => {
            const intents = intentsForGroup(g.id);
            if (intents.length === 0) return null;
            return (
              <section key={g.id} aria-label={g.label}>
                <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <Icon name={g.icon} size={12} className="text-slate-500" />
                  {g.label}
                </h3>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {intents.map((intent) => (
                    <IntentCard
                      key={intent.id}
                      intent={intent}
                      selected={selectedIntentId === intent.id}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {intentsForGroup(group).map((intent) => (
            <IntentCard
              key={intent.id}
              intent={intent}
              selected={selectedIntentId === intent.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <Icon name={icon} size={12} className={active ? "text-amber-400" : "text-slate-500"} />
      {label}
    </button>
  );
}
