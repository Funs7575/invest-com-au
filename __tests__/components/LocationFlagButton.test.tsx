import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, userEvent, waitFor } from "./setup";

// Mock the intent-country server actions. Hoisted so the vi.mock
// factory can reference them — see CLAUDE.md vitest hoisting note.
const { mockSetIntentCountry, mockClearIntentCountry } = vi.hoisted(() => ({
  mockSetIntentCountry: vi.fn(),
  mockClearIntentCountry: vi.fn(),
}));

vi.mock("@/lib/intent-context-actions", () => ({
  setIntentCountryAction: mockSetIntentCountry,
  clearIntentCountryAction: mockClearIntentCountry,
}));

// Mock /api/geo so the detection effect doesn't actually fetch.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import LocationFlagButton from "@/components/layout/LocationFlagButton";

describe("LocationFlagButton", () => {
  beforeEach(() => {
    mockSetIntentCountry.mockClear();
    mockClearIntentCountry.mockClear();
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
    it("renders flag-only when AU (default state)", async () => {
      render(<LocationFlagButton />);
      const trigger = screen.getByRole("button", {
        name: /switch to investing-from-overseas view/i,
      });
      expect(trigger).toBeInTheDocument();
      // The country name short label is hidden (Tailwind 'hidden sm:inline')
      // when AU. Asserting absence of any of the supported-country names
      // suffices.
      expect(screen.queryByText(/Hong Kong|UK|India|Singapore/)).not.toBeInTheDocument();
    });

    it("renders flag + short name when a country is selected (override → state)", async () => {
      // Pre-stamp localStorage so the first effect picks it up
      localStorage.setItem("iv-location-flag-override", "HK");
      render(<LocationFlagButton />);
      // Wait for the post-mount effect that reads localStorage
      const nameLabel = await screen.findByText("Hong Kong");
      expect(nameLabel).toBeInTheDocument();
    });
  });

  describe("grid click writes both localStorage + cookie", () => {
    it("calls setIntentCountryAction with the intent code (not the ISO)", async () => {
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

  describe("'I'm browsing as Australian' clears cookie + resets localStorage", () => {
    it("calls clearIntentCountryAction and stores AU in localStorage", async () => {
      const user = userEvent.setup();
      // Start with HK as the active country so the popover renders the
      // "Viewing as" branch with the AU-reset link.
      localStorage.setItem("iv-location-flag-override", "HK");
      render(<LocationFlagButton />);

      // Wait for the override to settle, then open the popover
      await screen.findByText("Hong Kong");
      await user.click(screen.getByRole("button"));

      const resetButton = await screen.findByRole("button", {
        name: /browsing as an Australian/i,
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
});
