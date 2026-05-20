import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, userEvent, mockToggle, mockHas } from "./setup";

// useToast isn't mocked by setup.tsx — provide a spyable toast fn.
const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));
vi.mock("@/components/Toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

import ShortlistButton from "@/components/ShortlistButton";

beforeEach(() => {
  mockToggle.mockClear();
  mockHas.mockReset();
  mockHas.mockReturnValue(false);
  toastMock.mockClear();
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

  it("clicking toggles the slug and shows the 'Added' toast", async () => {
    const user = userEvent.setup();
    render(<ShortlistButton slug="acme" name="Acme" />);
    await user.click(screen.getByRole("button"));
    expect(mockToggle).toHaveBeenCalledWith("acme");
    expect(toastMock).toHaveBeenCalledWith(
      "Added Acme to shortlist",
      "success",
    );
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

  it("clicking shows the 'Removed' toast", async () => {
    const user = userEvent.setup();
    render(<ShortlistButton slug="acme" name="Acme" />);
    await user.click(screen.getByRole("button"));
    expect(mockToggle).toHaveBeenCalledWith("acme");
    expect(toastMock).toHaveBeenCalledWith(
      "Removed Acme from shortlist",
      "success",
    );
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
