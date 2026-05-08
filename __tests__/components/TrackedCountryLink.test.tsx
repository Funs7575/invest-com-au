/**
 * Unit tests for TrackedCountryLink — the client wrapper that fires a
 * Country Mode trackEvent on click before delegating navigation to
 * next/link. Tracking must be fire-and-forget; failures must not block
 * navigation or shadow a user-supplied onClick.
 *
 * Note: __tests__/components/setup.tsx mocks @/lib/tracking globally
 * (trackEvent is replaced with vi.fn()). We grab that mock via
 * vi.mocked rather than redeclaring vi.mock here, which would conflict.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "./setup";
import { trackEvent } from "@/lib/tracking";
import TrackedCountryLink from "@/components/country-mode/TrackedCountryLink";

const mockTrackEvent = vi.mocked(trackEvent);

describe("TrackedCountryLink", () => {
  beforeEach(() => {
    mockTrackEvent.mockReset();
  });

  it("renders a link with the supplied href and children", () => {
    render(
      <TrackedCountryLink href="/advisors/jane-doe" eventType="country_expert_click">
        Jane Doe
      </TrackedCountryLink>,
    );
    const link = screen.getByRole("link", { name: "Jane Doe" });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/advisors/jane-doe");
  });

  it("fires trackEvent with eventType + eventData on click", async () => {
    const user = userEvent.setup();
    render(
      <TrackedCountryLink
        href="/invest/property/foo"
        eventType="country_listing_click"
        eventData={{ country: "hk", listing_slug: "foo" }}
      >
        click me
      </TrackedCountryLink>,
    );
    await user.click(screen.getByRole("link", { name: "click me" }));
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith("country_listing_click", {
      country: "hk",
      listing_slug: "foo",
    });
  });

  it("does not block navigation when trackEvent throws", async () => {
    mockTrackEvent.mockImplementation(() => {
      throw new Error("tracking down");
    });
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <TrackedCountryLink
        href="/x"
        eventType="country_listing_click"
        onClick={onClick}
      >
        click me
      </TrackedCountryLink>,
    );
    await user.click(screen.getByRole("link", { name: "click me" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards a user-supplied onClick after firing trackEvent", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <TrackedCountryLink
        href="/x"
        eventType="country_expert_click"
        onClick={onClick}
      >
        click me
      </TrackedCountryLink>,
    );
    await user.click(screen.getByRole("link", { name: "click me" }));
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
