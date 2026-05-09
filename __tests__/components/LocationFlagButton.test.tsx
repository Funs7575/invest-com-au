import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, userEvent, waitFor, act } from "./setup";

// Auto-mock the modules we assert on — every named export becomes a
// vi.fn() and the imports below resolve to those mock fns directly.
// Avoids the partial-factory binding fragility we hit on the first try.
vi.mock("@/lib/intent-context-actions");
vi.mock("@/lib/tracking");

// Mock /api/geo so the detection effect doesn't actually fetch.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import LocationFlagButton from "@/components/layout/LocationFlagButton";
import {
  setIntentCountryAction,
  clearIntentCountryAction,
} from "@/lib/intent-context-actions";
import { trackEvent } from "@/lib/tracking";

const mockSetIntentCountry = vi.mocked(setIntentCountryAction);
const mockClearIntentCountry = vi.mocked(clearIntentCountryAction);
const mockTrackEvent = vi.mocked(trackEvent);

describe("LocationFlagButton", () => {
  beforeEach(() => {
    mockSetIntentCountry.mockClear();
    mockClearIntentCountry.mockClear();
    mockTrackEvent.mockClear();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ country: null }) });
    localStorage.clear();
    // Clear any stray cookie state from a previous test
    document.cookie = "iv_intent_country=; max-age=0; path=/";
  });

  afterEach(() => {
    localStorage.clear();
    document.cookie = "iv_intent_country=; max-age=0; path=/";
  });

  describe("trigger label", () => {
    it("renders flag + chevron with no country name when AU (default state)", async () => {
      render(<LocationFlagButton />);
      const trigger = screen.getByRole("button", {
        name: /switch to investing-from-overseas view/i,
      });
      expect(trigger).toBeInTheDocument();
      // Chevron telegraphs "menu" affordance — must always render.
      expect(trigger).toHaveTextContent("▾");
      // No country name on default state.
      expect(screen.queryByText(/Hong Kong|UK|India|Singapore/)).not.toBeInTheDocument();
    });

    it("renders flag + ISO + long name + chevron when a country is selected", async () => {
      // Pre-stamp localStorage so the first effect picks it up
      localStorage.setItem("iv-location-flag-override", "HK");
      render(<LocationFlagButton />);
      // Aria-label for confirmed selection: "Currently viewing as Hong
      // Kong. Switch country" (vs the suggested-state "Investing from X?
      // Switch view"). The label distinction is the contract — it's how
      // a screen-reader user knows whether they've confirmed a country
      // or whether the system has only guessed at one.
      const trigger = await screen.findByRole("button", {
        name: /Currently viewing as Hong Kong/i,
      });
      // Both the mobile-only ISO and the desktop long name render in the
      // DOM (Tailwind responsive classes don't compute in jsdom). Both
      // should be present so screen-readers and breakpoint switches
      // hand off cleanly.
      expect(trigger).toHaveTextContent("Hong Kong");
      expect(trigger).toHaveTextContent("HK");
      expect(trigger).toHaveTextContent("▾");
    });
  });

  describe("grid click writes both localStorage + cookie", () => {
    // First grid-click run cold-starts userEvent + opens the popover; the
    // default 5s timeout is enough on warm runs but flaky on cold. Bumping
    // to 10s gives the cold path room without slowing the hot path.
    it("calls setIntentCountryAction with the intent code (not the ISO)", { timeout: 10_000 }, async () => {
      const user = userEvent.setup();
      render(<LocationFlagButton />);

      // Open the popover
      await user.click(screen.getByRole("button"));

      // The grid contains 12 country links. Pick UK — its label is "UK"
      // (the "the " prefix is stripped on render).
      const ukLink = await screen.findByRole("link", { name: /^UK$/ });
      await user.click(ukLink);

      // ISO code is "GB"; intent code is "uk". The action must receive
      // "uk" — feeding "GB" would fail isKnownIntentCountry and silently
      // skip the cookie write.
      expect(mockSetIntentCountry).toHaveBeenCalledWith("uk");
      expect(mockSetIntentCountry).toHaveBeenCalledTimes(1);
      // localStorage gets the ISO ("GB") for the existing override flow
      expect(localStorage.getItem("iv-location-flag-override")).toBe("GB");
    });

    it("maps Hong Kong correctly (HK ISO → hk intent)", async () => {
      const user = userEvent.setup();
      render(<LocationFlagButton />);
      await user.click(screen.getByRole("button"));
      await user.click(await screen.findByRole("link", { name: /^Hong Kong$/ }));
      expect(mockSetIntentCountry).toHaveBeenCalledWith("hk");
      expect(localStorage.getItem("iv-location-flag-override")).toBe("HK");
    });
  });

  describe("'Switch to Australia' clears cookie + resets localStorage", () => {
    it("calls clearIntentCountryAction and stores AU in localStorage", async () => {
      const user = userEvent.setup();
      // Start with HK as the active country so the popover renders the
      // "Viewing as" branch with the AU-reset button.
      localStorage.setItem("iv-location-flag-override", "HK");
      render(<LocationFlagButton />);

      // Wait for the override to settle, then open the popover
      await screen.findByText("Hong Kong");
      await user.click(
        screen.getByRole("button", { name: /Currently viewing as Hong Kong/i }),
      );

      const resetButton = await screen.findByRole("button", {
        name: /switch to australia/i,
      });
      await user.click(resetButton);

      expect(mockClearIntentCountry).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem("iv-location-flag-override")).toBe("AU");
    });
  });

  describe("mount-time localStorage → cookie migration", () => {
    it("syncs localStorage country to cookie when cookie is missing", async () => {
      // Existing user: localStorage was set before Country Mode wired
      // the server action, so the cookie isn't there yet.
      localStorage.setItem("iv-location-flag-override", "GB");
      // Cookie intentionally cleared in beforeEach
      render(<LocationFlagButton />);

      await waitFor(() => {
        expect(mockSetIntentCountry).toHaveBeenCalledWith("uk");
      });
    });

    it("does NOT sync when localStorage is 'AU'", async () => {
      localStorage.setItem("iv-location-flag-override", "AU");
      render(<LocationFlagButton />);

      // Give effects a chance to run
      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });
      // Migration must skip "AU" — that's the explicit "I'm browsing
      // as Australian" state, not a country mode.
      expect(mockSetIntentCountry).not.toHaveBeenCalled();
    });

    it("does NOT sync when the cookie already exists", async () => {
      localStorage.setItem("iv-location-flag-override", "HK");
      document.cookie = "iv_intent_country=hk; path=/";
      render(<LocationFlagButton />);

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });
      expect(mockSetIntentCountry).not.toHaveBeenCalled();
    });

    it("does NOT sync when localStorage holds an unsupported ISO", async () => {
      localStorage.setItem("iv-location-flag-override", "DE");
      render(<LocationFlagButton />);

      await waitFor(() => {
        expect(screen.getByRole("button")).toBeInTheDocument();
      });
      expect(mockSetIntentCountry).not.toHaveBeenCalled();
    });
  });

  describe("country-mode:open-selector event opens the popover", () => {
    it("dispatches open the popover from elsewhere on the page", async () => {
      render(<LocationFlagButton />);
      // Popover starts closed
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();

      act(() => {
        window.dispatchEvent(new CustomEvent("country-mode:open-selector"));
      });

      // Popover is now open
      expect(await screen.findByRole("menu")).toBeInTheDocument();
    });
  });

  describe("popover suggested state (geo-detected, not user-confirmed)", () => {
    beforeEach(() => {
      mockFetch.mockReset();
      // Detected country = HK, no override, no dismissal → suggested state
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ country: "HK" }) });
    });

    it("shows soft prompt with View+Stay buttons (no action list)", async () => {
      const user = userEvent.setup();
      render(<LocationFlagButton />);

      // Wait for state to propagate — fetch returning isn't enough; the
      // .then chain needs to resolve and the setState commit to flush.
      // Aria-label flip is the DOM-observable signal.
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /Investing from Hong Kong/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /Investing from Hong Kong/i }));

      // Soft prompt copy
      expect(await screen.findByText(/Looks like you/i)).toBeInTheDocument();
      // Both CTAs present
      expect(screen.getByRole("link", { name: /View Hong Kong version/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Stay on global/i })).toBeInTheDocument();
    });

    it("trigger does NOT show country name when state is merely suggested", async () => {
      render(<LocationFlagButton />);
      // Wait for the aria-label flip — fetch having returned isn't enough,
      // the .then chain has to resolve and React has to commit. Matches the
      // pattern in the sibling "shows soft prompt" test above; bare
      // mockFetch.toHaveBeenCalled() flakes under coverage instrumentation.
      const trigger = await screen.findByRole("button", {
        name: /Investing from Hong Kong/i,
      });
      // Country name is suppressed in the trigger when not user-confirmed.
      // The trigger still shows the flag (matching detected) but no label.
      expect(trigger.textContent ?? "").not.toContain("Hong Kong");
    });

    it("'Stay on global' marks dismissed and fires tracking", async () => {
      const user = userEvent.setup();
      render(<LocationFlagButton />);

      // Wait for the fetch chain to resolve and state to commit.
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /Investing from Hong Kong/i }),
        ).toBeInTheDocument(),
      );
      await user.click(screen.getByRole("button", { name: /Investing from Hong Kong/i }));

      const stay = await screen.findByRole("button", { name: /Stay on global/i });
      await user.click(stay);

      expect(localStorage.getItem("iv-country-prompt-dismissed")).toBe("1");
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "country_mode_dismissed",
        expect.objectContaining({ country: "hk", source: "popover_suggestion" }),
      );
      // Cookie must NOT be touched — user is not in country mode, just
      // not interested in the soft prompt.
      expect(mockSetIntentCountry).not.toHaveBeenCalled();
      expect(mockClearIntentCountry).not.toHaveBeenCalled();
    });

    it("dismissed state suppresses suggestion on next mount (popover shows generic AU)", async () => {
      // Pre-set dismissed flag — mounts with prior dismissal in place.
      localStorage.setItem("iv-country-prompt-dismissed", "1");
      const user = userEvent.setup();
      render(<LocationFlagButton />);

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      await user.click(screen.getByRole("button"));

      // Should NOT see the soft prompt — generic state instead
      expect(screen.queryByText(/Looks like you/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Investing from overseas\?/i)).toBeInTheDocument();
    });
  });
});
