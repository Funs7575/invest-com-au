import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "./setup";

// Mock getIntentCountry — banner reads the cookie via next/headers via
// the server-only module split. The test stubs the resolved value.
const { mockGetIntentCountry } = vi.hoisted(() => ({
  mockGetIntentCountry: vi.fn(),
}));

vi.mock("@/lib/intent-context-server", () => ({
  getIntentCountry: mockGetIntentCountry,
}));

import CountryModeBanner from "@/components/country-mode/CountryModeBanner";

describe("CountryModeBanner", () => {
  beforeEach(() => {
    mockGetIntentCountry.mockReset();
  });

  it("returns null when the cookie isn't set (homepage stays clean)", async () => {
    mockGetIntentCountry.mockResolvedValue(null);
    const result = await CountryModeBanner();
    expect(result).toBeNull();
  });

  it("renders the banner with the country label when the cookie is set", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    const ui = await CountryModeBanner();
    render(<>{ui}</>);
    expect(screen.getByText(/HK investors/i)).toBeInTheDocument();
    // Both escape hatches present
    expect(screen.getByRole("button", { name: /switch country/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to australia/i })).toBeInTheDocument();
  });

  it("'Switch country' dispatches the open-selector custom event", async () => {
    mockGetIntentCountry.mockResolvedValue("uk");
    const ui = await CountryModeBanner();
    render(<>{ui}</>);
    const user = userEvent.setup();
    const listener = vi.fn();
    window.addEventListener("country-mode:open-selector", listener);
    await user.click(screen.getByRole("button", { name: /switch country/i }));
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("country-mode:open-selector", listener);
  });

  it("'Back to Australia' button is a form submit (calls clearIntentCountryAction server action)", async () => {
    mockGetIntentCountry.mockResolvedValue("sa");
    const ui = await CountryModeBanner();
    render(<>{ui}</>);
    const button = screen.getByRole("button", { name: /back to australia/i });
    expect(button).toHaveAttribute("type", "submit");
    // The server action wiring is exercised at the framework level — the
    // contract here is just "this is a form submit, the action prop on
    // the form is what next/server invokes."
    expect(button.closest("form")).toBeInTheDocument();
  });
});
