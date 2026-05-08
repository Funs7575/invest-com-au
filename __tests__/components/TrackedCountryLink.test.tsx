import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "./setup";

vi.mock("@/lib/tracking");

import TrackedCountryLink from "@/components/country-mode/TrackedCountryLink";
import { trackEvent } from "@/lib/tracking";

const mockTrackEvent = vi.mocked(trackEvent);

describe("TrackedCountryLink", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
  });

  it("renders as an anchor with the given href", () => {
    render(
      <TrackedCountryLink
        href="/invest/property/sydney-cbd-office"
        eventName="country_listing_click"
        country="hk"
      >
        Sydney CBD office
      </TrackedCountryLink>,
    );
    const link = screen.getByRole("link", { name: /Sydney CBD office/i });
    expect(link).toHaveAttribute("href", "/invest/property/sydney-cbd-office");
  });

  it("fires the configured event with country + target + source on click", async () => {
    const user = userEvent.setup();
    render(
      <TrackedCountryLink
        href="/advisors/alex-tax"
        eventName="country_expert_click"
        country="hk"
        targetId="alex-tax"
        source="homepage_preview"
      >
        Alex Tax
      </TrackedCountryLink>,
    );

    await user.click(screen.getByRole("link", { name: /Alex Tax/i }));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "country_expert_click",
      expect.objectContaining({
        country: "hk",
        target: "alex-tax",
        source: "homepage_preview",
      }),
    );
  });

  it("nulls out optional dimensions when not provided", async () => {
    const user = userEvent.setup();
    render(
      <TrackedCountryLink
        href="/compare/non-residents"
        eventName="country_compare_click"
        country="uk"
      >
        Compare all
      </TrackedCountryLink>,
    );

    await user.click(screen.getByRole("link", { name: /Compare all/i }));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "country_compare_click",
      expect.objectContaining({
        country: "uk",
        target: null,
        source: null,
      }),
    );
  });

  it("does not block navigation if trackEvent throws", async () => {
    mockTrackEvent.mockImplementation(() => {
      throw new Error("Tracking endpoint down");
    });
    const user = userEvent.setup();
    render(
      <TrackedCountryLink
        href="/invest/funds/foo"
        eventName="country_listing_click"
        country="hk"
        targetId={42}
      >
        Some listing
      </TrackedCountryLink>,
    );

    // Clicking should not throw, and the link's href is intact.
    await user.click(screen.getByRole("link", { name: /Some listing/i }));
    expect(screen.getByRole("link", { name: /Some listing/i })).toHaveAttribute(
      "href",
      "/invest/funds/foo",
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
