import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, act } from "./setup";

// setup.tsx already mocks "@/lib/marketplace/frequency-cap" but only
// exposes filterByFrequencyCap. ImpressionTracker also imports
// recordWinnerImpressions from that module — re-mock via vi.doMock
// (not hoisted) so this override runs AFTER setup.tsx and includes
// both exports without modifying shared setup.
const recordImp = vi.fn();
vi.doMock("@/lib/marketplace/frequency-cap", () => ({
  filterByFrequencyCap: vi.fn().mockReturnValue([]),
  recordWinnerImpressions: recordImp,
}));

const { default: ImpressionTracker } = await import(
  "@/components/ImpressionTracker"
);
type PlacementWinner = import("@/lib/sponsorship").PlacementWinner;

type IOCallback = (entries: IntersectionObserverEntry[]) => void;
const observers: Array<{
  cb: IOCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}> = [];

class MockIO {
  cb: IOCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  constructor(cb: IOCallback) {
    this.cb = cb;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
    observers.push({ cb, observe: this.observe, disconnect: this.disconnect });
  }
}

const fetchMock = vi.fn().mockResolvedValue({ ok: true });

beforeEach(() => {
  observers.length = 0;
  recordImp.mockReset();
  fetchMock.mockClear();
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIO;
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
});

afterEach(() => {
  delete (globalThis as unknown as { IntersectionObserver?: unknown })
    .IntersectionObserver;
  delete (globalThis as unknown as { fetch?: unknown }).fetch;
});

function makeWinner(over: Partial<PlacementWinner>): PlacementWinner {
  return {
    campaign_id: 1,
    broker_slug: "broker-a",
    ...over,
  } as PlacementWinner;
}

describe("ImpressionTracker", () => {
  it("renders an invisible aria-hidden marker", () => {
    const { container } = render(
      <ImpressionTracker winners={[]} placement="hp" page="/" />,
    );
    const marker = container.querySelector("div");
    expect(marker).toHaveAttribute("aria-hidden", "true");
    expect(marker?.className).toContain("w-0");
    expect(marker?.className).toContain("h-0");
  });

  it("does not subscribe to IntersectionObserver when winners is empty", () => {
    render(<ImpressionTracker winners={[]} placement="hp" page="/" />);
    expect(observers).toHaveLength(0);
  });

  it("subscribes once when winners are supplied", () => {
    render(
      <ImpressionTracker
        winners={[makeWinner({ campaign_id: 1 })]}
        placement="hp"
        page="/"
      />,
    );
    expect(observers).toHaveLength(1);
    expect(observers[0]?.observe).toHaveBeenCalledTimes(1);
  });

  it("records frequency-cap and fires a fetch per winner when entry intersects", () => {
    const winners = [
      makeWinner({ campaign_id: 11, broker_slug: "a" }),
      makeWinner({ campaign_id: 22, broker_slug: "b" }),
    ];
    render(
      <ImpressionTracker
        winners={winners}
        placement="hp-featured"
        page="/"
      />,
    );

    act(() => {
      observers[0]?.cb([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });

    expect(recordImp).toHaveBeenCalledTimes(1);
    expect(recordImp).toHaveBeenCalledWith(winners, "hp-featured");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall?.[0]).toBe("/api/marketplace/impression");
    const body = JSON.parse(firstCall?.[1]?.body as string);
    expect(body).toEqual({
      campaign_id: 11,
      broker_slug: "a",
      page: "/",
      placement: "hp-featured",
    });
  });

  it("does nothing on a non-intersecting entry", () => {
    render(
      <ImpressionTracker
        winners={[makeWinner({})]}
        placement="hp"
        page="/"
      />,
    );
    act(() => {
      observers[0]?.cb([
        { isIntersecting: false } as IntersectionObserverEntry,
      ]);
    });
    expect(recordImp).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only fires once across multiple intersect callbacks (sentRef guard)", () => {
    render(
      <ImpressionTracker
        winners={[makeWinner({})]}
        placement="hp"
        page="/"
      />,
    );
    act(() => {
      observers[0]?.cb([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    act(() => {
      observers[0]?.cb([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    expect(recordImp).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("disconnects the observer after firing", () => {
    render(
      <ImpressionTracker
        winners={[makeWinner({})]}
        placement="hp"
        page="/"
      />,
    );
    act(() => {
      observers[0]?.cb([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    // Both the manual disconnect inside the IO callback and the
    // effect-cleanup disconnect run, so at least 1 call is expected.
    expect(observers[0]?.disconnect.mock.calls.length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("disconnects the observer on unmount even if no impression fired", () => {
    const { unmount } = render(
      <ImpressionTracker
        winners={[makeWinner({})]}
        placement="hp"
        page="/"
      />,
    );
    const obs = observers[0];
    unmount();
    expect(obs?.disconnect).toHaveBeenCalled();
  });

  it("swallows fetch rejection without throwing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    render(
      <ImpressionTracker
        winners={[makeWinner({})]}
        placement="hp"
        page="/"
      />,
    );
    act(() => {
      observers[0]?.cb([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
