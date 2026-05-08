"use client";

/**
 * Tiny client wrapper for the "Switch country" button inside
 * CountryModeBanner (a server component). Dispatches a custom event
 * that LocationFlagButton listens for to open its popover. Custom
 * event keeps the banner and selector decoupled — neither imports
 * the other directly.
 */

export const COUNTRY_MODE_OPEN_SELECTOR_EVENT = "country-mode:open-selector";

export default function CountryModeBannerSwitchButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(COUNTRY_MODE_OPEN_SELECTOR_EVENT));
        }
      }}
      className="text-slate-600 hover:text-slate-900 underline underline-offset-2"
    >
      Switch country
    </button>
  );
}
