// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "./setup";
import type { ABTestConfig } from "@/lib/ab-test";

// Must be declared before vi.mock factory (hoisting)
const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({ then: mockSelect }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, onClick, className, style }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <a href={href} onClick={onClick} className={className} style={style}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/design/DesignIcon", () => ({
  DesignIcon: () => <span data-testid="design-icon" />,
}));

// Silence fetch calls in tests
const originalFetch = global.fetch;

import React from "react";
import HomeHeroCTA from "@/components/HomeHeroCTA";

const makeTest = (overrides: Partial<ABTestConfig> = {}): ABTestConfig => ({
  id: 42,
  name: "Hero CTA Test",
  test_type: "cta",
  status: "running",
  traffic_split: 50,
  variant_a: { text: "Control text" },
  variant_b: { text: "Variant text" },
  ...overrides,
});

describe("HomeHeroCTA", () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name) document.cookie = `${name}=; path=/; max-age=0`;
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders default CTA text when no active test is running", async () => {
    mockSelect.mockImplementation((cb: (result: { data: null }) => void) => {
      cb({ data: null });
      return Promise.resolve();
    });

    render(<HomeHeroCTA />);
    expect(screen.getByText(/Get matched in 60 seconds/)).toBeInTheDocument();
  });

  it("renders variant A text when assigned to variant A", async () => {
    const test = makeTest();
    // Pin to variant A via cookie
    document.cookie = `_inv_ab_42=a; path=/`;

    mockSelect.mockImplementation((cb: (result: { data: ABTestConfig[] }) => void) => {
      cb({ data: [test] });
      return Promise.resolve();
    });

    render(<HomeHeroCTA />);
    await waitFor(() => {
      expect(screen.getByText(/Control text/)).toBeInTheDocument();
    });
  });

  it("renders variant B text when assigned to variant B", async () => {
    const test = makeTest();
    // Pin to variant B via cookie
    document.cookie = `_inv_ab_42=b; path=/`;

    mockSelect.mockImplementation((cb: (result: { data: ABTestConfig[] }) => void) => {
      cb({ data: [test] });
      return Promise.resolve();
    });

    render(<HomeHeroCTA />);
    await waitFor(() => {
      expect(screen.getByText(/Variant text/)).toBeInTheDocument();
    });
  });

  it("falls back to default text when variant config has no text field", async () => {
    const test = makeTest({ variant_a: {}, variant_b: {} });
    document.cookie = `_inv_ab_42=a; path=/`;

    mockSelect.mockImplementation((cb: (result: { data: ABTestConfig[] }) => void) => {
      cb({ data: [test] });
      return Promise.resolve();
    });

    render(<HomeHeroCTA />);
    await waitFor(() => {
      expect(screen.getByText(/Get matched in 60 seconds/)).toBeInTheDocument();
    });
  });

  it("links to /quiz", () => {
    mockSelect.mockImplementation((cb: (result: { data: null }) => void) => {
      cb({ data: null });
      return Promise.resolve();
    });

    render(<HomeHeroCTA />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/quiz");
  });

  it("fires impression tracking on mount when a test is active", async () => {
    const test = makeTest();
    document.cookie = `_inv_ab_42=a; path=/`;

    mockSelect.mockImplementation((cb: (result: { data: ABTestConfig[] }) => void) => {
      cb({ data: [test] });
      return Promise.resolve();
    });

    render(<HomeHeroCTA />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/ab-track",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"event_type":"impression"'),
        })
      );
    });
  });

  it("fires click tracking when clicked during an active test", async () => {
    const test = makeTest();
    document.cookie = `_inv_ab_42=a; path=/`;

    mockSelect.mockImplementation((cb: (result: { data: ABTestConfig[] }) => void) => {
      cb({ data: [test] });
      return Promise.resolve();
    });

    render(<HomeHeroCTA />);
    await waitFor(() => screen.getByText(/Control text/));

    screen.getByRole("link").click();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/ab-track",
      expect.objectContaining({
        body: expect.stringContaining('"event_type":"click"'),
      })
    );
  });
});
