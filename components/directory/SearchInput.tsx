"use client";

import Icon from "@/components/Icon";

/**
 * Canonical search-input primitive for directory pages.
 *
 * Renders a controlled <input type="search"> with a search icon, a
 * clear-button affordance when non-empty, and a screen-reader label.
 * Wraps the input in a <form role="search"> so user agents and assistive
 * tech recognise this as a site/section search.
 *
 * Semantics
 * ---------
 *  - `onChange` fires on every keystroke. Wire it to "draft" state if
 *    your page treats search as a deferred submit (e.g. /invest waits
 *    for Enter), or to "committed" state if it should filter live.
 *  - `onSubmit` fires on Enter or form submission. If you set it, the
 *    component prevents the default page reload. Optional.
 *  - Escape clears the input AND fires `onSubmit("")` if provided, so
 *    deferred-submit pages clear their committed query too.
 *
 * Styling
 * -------
 * The primitive ships the standard 12 px padding, 8 px border radius,
 * amber focus ring (matching the rest of the directory toolbar). Pass
 * `className` to override sizing or layout but don't override the
 * focus ring without a good reason — it's the only visual signal that
 * the field is keyboard-focused.
 */
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fires on Enter / form submission. Receives the current value. */
  onSubmit?: (value: string) => void;
  placeholder: string;
  /** ARIA label for the input. Defaults to the placeholder. */
  ariaLabel?: string;
  /** Stable id so an external <label> can target the input. */
  id?: string;
  /** Outer wrapper extra classes (typically flex-1 in a toolbar row). */
  className?: string;
  /**
   * Optional typeahead suggestions. When provided, the browser renders a
   * native datalist dropdown (no extra a11y wiring, keyboard-accessible).
   * Purely additive — omit it and the input behaves exactly as before.
   */
  suggestions?: ReadonlyArray<string>;
}

const FOCUS_RING =
  "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400";

export default function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel,
  id = "directory-search",
  className = "",
  suggestions,
}: SearchInputProps) {
  const listId = `${id}-suggestions`;
  const hasSuggestions = Array.isArray(suggestions) && suggestions.length > 0;
  return (
    <form
      role="search"
      className={`flex-1 min-w-0 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
    >
      <label htmlFor={id} className="sr-only">
        {ariaLabel ?? placeholder}
      </label>
      <div className="relative">
        <Icon
          name="search"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        />
        <input
          id={id}
          type="search"
          inputMode="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onChange("");
              onSubmit?.("");
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          list={hasSuggestions ? listId : undefined}
          autoComplete={hasSuggestions ? "off" : undefined}
          className={`w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 py-2 text-sm text-slate-800 placeholder:text-slate-500 ${FOCUS_RING}`}
        />
        {hasSuggestions && (
          <datalist id={listId}>
            {suggestions!.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onSubmit?.("");
            }}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-[11px] font-bold"
          >
            ×
          </button>
        )}
      </div>
    </form>
  );
}
