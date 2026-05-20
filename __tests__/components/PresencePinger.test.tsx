import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, act } from "./setup";
import PresencePinger from "@/components/PresencePinger";

const fetchMock = vi.fn();

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true });
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  setHidden(false);
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  delete (globalThis as unknown as { fetch?: unknown }).fetch;
});

describe("PresencePinger", () => {
  it("renders nothing in the DOM", () => {
    const { container } = render(
      <PresencePinger kind="professional" id={42} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("fires an immediate ping on mount with the right body", () => {
    render(<PresencePinger kind="professional" id={42} />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/presence/ping");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ kind: "professional", id: 42 });
  });

  it("does not ping on mount when the tab is hidden", () => {
    setHidden(true);
    render(<PresencePinger kind="team" id={7} />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pings again after the 90s poll interval elapses", () => {
    render(<PresencePinger kind="professional" id={1} />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Advance past the 60s throttle AND the 90s poll interval.
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throttles pings that arrive within 60s of the last one", () => {
    render(<PresencePinger kind="professional" id={1} />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Manually fire a visibilitychange before 60s — should be throttled.
    act(() => {
      vi.advanceTimersByTime(30_000);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("pings on visibilitychange once the throttle window has passed", () => {
    render(<PresencePinger kind="professional" id={1} />);
    act(() => {
      vi.advanceTimersByTime(61_000);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears the interval and removes the listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(
      <PresencePinger kind="professional" id={1} />,
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    // After unmount, advancing time should not produce more pings.
    const callsBefore = fetchMock.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(180_000);
    });
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
    removeSpy.mockRestore();
  });

  it("swallows a fetch rejection without throwing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(() =>
      render(<PresencePinger kind="professional" id={1} />),
    ).not.toThrow();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
