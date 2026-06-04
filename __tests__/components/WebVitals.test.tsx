import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render } from "./setup";

type WebVitalMetric = {
  name: string;
  value: number;
  id: string;
  rating: string;
};

// Capture the callback handed to useReportWebVitals so the test can
// invoke it manually as if next reported a metric.
let capturedCallback:
  | ((m: WebVitalMetric) => void)
  | undefined;
vi.mock("next/web-vitals", () => ({
  useReportWebVitals: (cb: (m: WebVitalMetric) => void) => {
    capturedCallback = cb;
  },
}));

vi.mock("@/lib/session", () => ({
  getSessionId: () => "sid-test",
}));

import WebVitals from "@/components/WebVitals";

const fetchMock = vi.fn();
const originalPathname = window.location.pathname;

beforeEach(() => {
  capturedCallback = undefined;
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true });
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  vi.unstubAllEnvs();
});

afterEach(() => {
  delete (globalThis as unknown as { fetch?: unknown }).fetch;
  vi.unstubAllEnvs();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, pathname: originalPathname },
  });
});

describe("WebVitals", () => {
  it("renders nothing in the DOM (null return)", () => {
    const { container } = render(<WebVitals />);
    expect(container.firstChild).toBeNull();
  });

  it("subscribes a callback via useReportWebVitals", () => {
    render(<WebVitals />);
    expect(capturedCallback).toBeTypeOf("function");
  });

  it("does NOT fetch in non-production environments (development default)", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<WebVitals />);
    capturedCallback?.({
      name: "LCP",
      value: 2345.678,
      id: "abc",
      rating: "good",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs to the dedicated /api/web-vitals beacon in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, pathname: "/some/path" },
    });
    render(<WebVitals />);
    capturedCallback?.({
      name: "LCP",
      value: 1234.567,
      id: "id-1",
      rating: "good",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/web-vitals");
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);

    // Shape must match app/api/web-vitals/route.ts's VitalsBody validation.
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      metric: "LCP",
      value: 1234.567, // raw value — route stores the sample as-is
      page_path: "/some/path",
      session_id: "sid-test",
    });
  });

  it("sends the raw (unrounded) metric value the route expects", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<WebVitals />);
    capturedCallback?.({
      name: "CLS",
      value: 0.123456789,
      id: "id-2",
      rating: "needs-improvement",
    });
    const body = JSON.parse(
      fetchMock.mock.calls[0]?.[1]?.body as string,
    );
    expect(body.value).toBe(0.123456789);
    expect(typeof body.value).toBe("number");
  });

  it("swallows a fetch rejection without throwing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    fetchMock.mockRejectedValueOnce(new Error("network"));
    render(<WebVitals />);
    expect(() =>
      capturedCallback?.({
        name: "TTFB",
        value: 100,
        id: "id-3",
        rating: "good",
      }),
    ).not.toThrow();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
