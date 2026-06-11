import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, userEvent, mockToggle, mockHas } from "./setup";

// Save feedback now routes through the unified celebration helper (D1).
const { mockCelebrateSave } = vi.hoisted(() => ({ mockCelebrateSave: vi.fn() }));
vi.mock("@/lib/celebrate", () => ({ celebrateSave: mockCelebrateSave }));

import ShortlistButton from "@/components/ShortlistButton";

beforeEach(() => {
  mockToggle.mockClear();
  mockHas.mockReset();
  mockHas.mockReturnValue(false);
  mockCelebrateSave.mockClear();
});

describe("ShortlistButton — unsaved state", () => {
  it("renders the save aria-label when the broker is not shortlisted", () => {
    render(<ShortlistButton slug="acme" name="Acme" />);
    expect(
      screen.getByRole("button", { name: "Save Acme to shortlist" }),
    ).toBeInTheDocument();
  });

  it("uses the unsaved title 'Save to My Platforms'", () => {
    render(<ShortlistButton slug="acme" name="Acme" />);
    expect(
      screen.getByRole("button", { name: "Save Acme to shortlist" }),
    ).toHaveAttribute("title", "Save to My Platforms");
  });

  it("clicking toggles the slug and celebrates the save", async () => {
    const user = userEvent.setup();
    render(<ShortlistButton slug="acme" name="Acme" />);
    await user.click(screen.getByRole("button"));
    expect(mockToggle).toHaveBeenCalledWith("acme");
    expect(mockCelebrateSave).toHaveBeenCalledWith({ saved: true, label: "Acme" });
  });

  it("svg is unfilled (fill='none') when unsaved", () => {
    const { container } = render(<ShortlistButton slug="acme" name="Acme" />);
    expect(container.querySelector("svg")).toHaveAttribute("fill", "none");
  });
});

describe("ShortlistButton — saved state", () => {
  beforeEach(() => {
    mockHas.mockReturnValue(true);
  });

  it("renders the remove aria-label when the broker is shortlisted", () => {
    render(<ShortlistButton slug="acme" name="Acme" />);
    expect(
      screen.getByRole("button", { name: "Remove Acme from shortlist" }),
    ).toBeInTheDocument();
  });

  it("clicking acknowledges the removal", async () => {
    const user = userEvent.setup();
    render(<ShortlistButton slug="acme" name="Acme" />);
    await user.click(screen.getByRole("button"));
    expect(mockToggle).toHaveBeenCalledWith("acme");
    expect(mockCelebrateSave).toHaveBeenCalledWith({ saved: false, label: "Acme" });
  });

  it("svg is filled (fill='currentColor') when saved", () => {
    const { container } = render(<ShortlistButton slug="acme" name="Acme" />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "fill",
      "currentColor",
    );
  });

  it("applies the red saved palette to the button", () => {
    render(<ShortlistButton slug="acme" name="Acme" />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("text-red-500");
  });
});

describe("ShortlistButton — size variants", () => {
  it("default (sm) uses w-7 h-7", () => {
    render(<ShortlistButton slug="acme" name="Acme" />);
    expect(screen.getByRole("button").className).toContain("w-7");
  });

  it("md uses w-9 h-9", () => {
    render(<ShortlistButton slug="acme" name="Acme" size="md" />);
    expect(screen.getByRole("button").className).toContain("w-9");
  });
});
