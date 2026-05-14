import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/script", () => ({
  default: vi.fn(({ src, "data-domain": dataDomain, strategy, defer }: {
    src?: string;
    "data-domain"?: string;
    strategy?: string;
    defer?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-sync-scripts -- test mock only, not real DOM
    <script
      data-testid="plausible-script"
      src={src}
      data-domain={dataDomain}
      data-strategy={strategy}
      data-defer={defer ? "true" : undefined}
    />
  )),
}));

describe("PlausibleAnalytics", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("renders nothing when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is not set", async () => {
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    const { default: PlausibleAnalytics } = await import(
      "@/components/PlausibleAnalytics"
    );
    const { container } = render(<PlausibleAnalytics />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the Plausible script when domain is configured", async () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "invest.com.au";
    const { default: PlausibleAnalytics } = await import(
      "@/components/PlausibleAnalytics"
    );
    const { getByTestId } = render(<PlausibleAnalytics />);
    const script = getByTestId("plausible-script");
    expect(script).toBeTruthy();
    expect(script.getAttribute("src")).toBe(
      "https://plausible.io/js/script.js"
    );
    expect(script.getAttribute("data-domain")).toBe("invest.com.au");
    expect(script.getAttribute("data-strategy")).toBe("afterInteractive");
  });

  it("uses afterInteractive strategy (does not block render)", async () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "invest.com.au";
    const { default: PlausibleAnalytics } = await import(
      "@/components/PlausibleAnalytics"
    );
    const { getByTestId } = render(<PlausibleAnalytics />);
    expect(getByTestId("plausible-script").getAttribute("data-strategy")).toBe(
      "afterInteractive"
    );
  });
});
