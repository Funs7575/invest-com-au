import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../setup";
import SortDropdown from "@/components/directory/SortDropdown";

const OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "rating", label: "Highest rated" },
  { value: "price-asc", label: "Price: low to high" },
];

describe("SortDropdown", () => {
  it("renders all supplied options", () => {
    render(<SortDropdown options={OPTIONS} value="newest" onChange={() => {}} />);
    for (const o of OPTIONS) {
      expect(screen.getByRole("option", { name: o.label })).toBeInTheDocument();
    }
  });

  it("marks the current value as selected", () => {
    render(<SortDropdown options={OPTIONS} value="rating" onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("rating");
  });

  it("fires onChange with the new value when user picks a different option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortDropdown options={OPTIONS} value="newest" onChange={onChange} />);
    await user.selectOptions(screen.getByRole("combobox"), "rating");
    expect(onChange).toHaveBeenCalledWith("rating");
  });

  it("uses the default 'Sort results' aria-label", () => {
    render(<SortDropdown options={OPTIONS} value="newest" onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-label", "Sort results");
  });

  it("uses the supplied ariaLabel when provided", () => {
    render(
      <SortDropdown
        options={OPTIONS}
        value="newest"
        onChange={() => {}}
        ariaLabel="Sort advisors"
      />,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-label", "Sort advisors");
  });
});
