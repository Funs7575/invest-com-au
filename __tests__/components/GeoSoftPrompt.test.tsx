import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, userEvent, waitFor } from "./setup";

// Auto-mock the modules we care about — every named export becomes a
// vi.fn(). After this, the imports below resolve to the mock fns
// directly, so we can assert on them via the import binding.
vi.mock("@/lib/intent-context-actions");
vi.mock("@/lib/tracking");

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import GeoSoftPrompt from "@/components/country-mode/GeoSoftPrompt";
import { setIntentCountryAction, clearIntentCountryAction } from "@/lib/intent-context-actions";
import { trackEvent } from "@/lib/tracking";

const mockSetIntentCountry = vi.mocked(setIntentCountryAction);
const mockClearIntentCountry = vi.mocked(clearIntentCountryAction);
const mockTrackEvent = vi.mocked(trackEvent);
// Suppress unused-warning for the mock import side-effect — the typed
// `mockClearIntentCountry` reference keeps the binding live for tests
// that may assert on it in the future.
void mockClearIntentCountry;

const FLAG_KEY = "iv-location-flag-override";
const DISMISSED_KEY = "iv-country-prompt-dismissed";

function clearAllSignals() {
  localStorage.clear();
  document.cookie = "iv_intent_country=; max-age=0; path=/";
}

describe("GeoSoftPrompt", () => {
  beforeEach(() => {
    mockSetIntentCountry.mockClear();
    mockTrackEvent.mockClear();
    mockFetch.mockReset();
    clearAllSignals();
  });

  afterEach(() => {
    clearAllSignals();
  });

  describe("eligibility gates", () => {
    it("does NOT render when the cookie is already set", async () => {
      document.cookie = "iv_intent_country=hk; path=/";
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ country: "GB" }) });

      render(<GeoSoftPrompt />);

      // Give effects a chance — should never render.
      await waitFor(() => {
        // Sanity check that something rendered (or rather, that the
        // component is mounted and we've passed React's first commit).
        expect(document.body).toBeInTheDocument();
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      // Fetch should be skipped entirely when the cookie short-circuits.
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does NOT render when localStorage flag-override is set", async () => {
      localStorage.setItem(FLAG_KEY, "GB");
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ country: "GB" }) });

      render(<GeoSoftPrompt />);
      await waitFor(() => expect(document.body).toBeInTheDocument());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does NOT render when the prompt has been dismissed before", async () => {
      localStorage.setItem(DISMISSED_KEY, "1");
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ country: "GB" }) });

      render(<GeoSoftPrompt />);
      await waitFor(() => expect(document.body).toBeInTheDocument());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does NOT render when geo returns an unsupported country", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ country: "DE" }) });

      render(<GeoSoftPrompt />);
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does NOT render when geo returns null", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ country: null }) });

      render(<GeoSoftPrompt />);
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("renders + tracking when conditions met", () => {
    it("renders the suggestion and fires country_mode_detected", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ country: "HK" }) });

      render(<GeoSoftPrompt />);

      // Banner appears post-fetch
      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveAttribute("aria-label", "Suggested country: Hong Kong");
      expect(screen.getByText(/Looks like you/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /View Hong Kong version/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Stay on global/i })).toBeInTheDocument();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "country_mode_detected",
        expect.objectContaining({ country: "hk", source: "geo" }),
      );
    });
  });

  describe("accept flow", () => {
    it("clicking 'View X version' sets cookie + localStorage + fires selected event", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ country: "GB" }) });
      const user = userEvent.setup();
      render(<GeoSoftPrompt />);

      const accept = await screen.findByRole("button", { name: /View UK version/i });
      await user.click(accept);

      expect(mockSetIntentCountry).toHaveBeenCalledWith("uk");
      expect(localStorage.getItem(FLAG_KEY)).toBe("GB");
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "country_mode_selected",
        expect.objectContaining({ country: "uk", source: "geo_prompt" }),
      );
    });
  });

  describe("dismiss flow", () => {
    it("clicking 'Stay on global' sets dismissed flag + fires dismissed event + does NOT touch cookie", async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ country: "SG" }) });
      const user = userEvent.setup();
      render(<GeoSoftPrompt />);

      const dismiss = await screen.findByRole("button", { name: /Stay on global/i });
      await user.click(dismiss);

      expect(localStorage.getItem(DISMISSED_KEY)).toBe("1");
      expect(localStorage.getItem(FLAG_KEY)).toBeNull();
      expect(mockSetIntentCountry).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "country_mode_dismissed",
        expect.objectContaining({ country: "sg", source: "geo_prompt" }),
      );
      // Banner unmounts after dismissal
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
