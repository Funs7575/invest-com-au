import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "./setup";

const { mockGetIntentCountry } = vi.hoisted(() => ({
  mockGetIntentCountry: vi.fn(),
}));

vi.mock("@/lib/intent-context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/intent-context")>(
    "@/lib/intent-context",
  );
  return {
    ...actual,
    getIntentCountry: mockGetIntentCountry,
  };
});

import HomePathfinder from "@/components/HomePathfinder";

describe("HomePathfinder", () => {
  beforeEach(() => {
    mockGetIntentCountry.mockReset();
  });

  it("links to /quiz when no country is set", async () => {
    mockGetIntentCountry.mockResolvedValue(null);
    const ui = await HomePathfinder();
    render(<>{ui}</>);
    const cta = screen.getByRole("link", { name: /Get matched in 60 seconds/i });
    expect(cta).toHaveAttribute("href", "/quiz");
  });

  it("carries the country slug forward when in country mode", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    const ui = await HomePathfinder();
    render(<>{ui}</>);
    const cta = screen.getByRole("link", { name: /Get matched in 60 seconds/i });
    expect(cta).toHaveAttribute("href", "/quiz?country=hong-kong");
  });

  it("uses the long slug for multi-word countries", async () => {
    mockGetIntentCountry.mockResolvedValue("uk");
    const ui = await HomePathfinder();
    render(<>{ui}</>);
    const cta = screen.getByRole("link", { name: /Get matched in 60 seconds/i });
    expect(cta).toHaveAttribute("href", "/quiz?country=united-kingdom");
  });
});
