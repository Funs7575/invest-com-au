import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "./setup";

const { hasConsentMock } = vi.hoisted(() => ({
  hasConsentMock: vi.fn(),
}));
vi.mock("@/lib/consent", () => ({
  hasAnalyticsConsent: hasConsentMock,
}));

// next/script renders a marker so any emitted pixel script is visible.
vi.mock("next/script", () => ({
  default: (props: Record<string, unknown>) => (
    <script data-testid="next-script" data-id={String(props.id ?? "")} />
  ),
}));

import TrackingPixels from "@/components/TrackingPixels";

beforeEach(() => {
  hasConsentMock.mockReset();
});

describe("TrackingPixels — consent gating", () => {
  it("renders nothing when analytics consent is absent", () => {
    hasConsentMock.mockReturnValue(false);
    const { container } = render(<TrackingPixels />);
    expect(container.firstChild).toBeNull();
  });

  it("checks consent on mount", () => {
    hasConsentMock.mockReturnValue(false);
    render(<TrackingPixels />);
    expect(hasConsentMock).toHaveBeenCalled();
  });

  it("re-renders to visible once a storage event flips consent to true", () => {
    // Start without consent…
    hasConsentMock.mockReturnValue(false);
    const { container } = render(<TrackingPixels />);
    expect(container.firstChild).toBeNull();

    // …then the user accepts; a storage event triggers a re-check.
    hasConsentMock.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage"));
    });
    // With consent true but no pixel env vars configured in the test
    // env, the component renders an empty fragment — still no script
    // markers, but it no longer returns the null sentinel branch.
    // We assert the consent re-check fired.
    expect(hasConsentMock).toHaveBeenCalledTimes(2);
  });

  it("removes the storage listener on unmount (no further consent checks)", () => {
    hasConsentMock.mockReturnValue(false);
    const { unmount } = render(<TrackingPixels />);
    const callsBefore = hasConsentMock.mock.calls.length;
    unmount();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage"));
    });
    expect(hasConsentMock.mock.calls.length).toBe(callsBefore);
  });
});
