import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../setup";
import SearchInput from "@/components/directory/SearchInput";

describe("SearchInput", () => {
  it("renders with the supplied placeholder and aria-label", () => {
    render(
      <SearchInput
        value=""
        onChange={() => {}}
        placeholder="Search listings"
      />,
    );
    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("placeholder", "Search listings");
    expect(input).toHaveAttribute("aria-label", "Search listings");
  });

  it("uses the explicit ariaLabel when supplied (overrides placeholder)", () => {
    render(
      <SearchInput
        value=""
        onChange={() => {}}
        placeholder="Search listings"
        ariaLabel="Search investment listings"
      />,
    );
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "aria-label",
      "Search investment listings",
    );
  });

  it("fires onChange on every keystroke", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchInput
        value=""
        onChange={onChange}
        placeholder="Search"
      />,
    );
    await user.type(screen.getByRole("searchbox"), "abc");
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenNthCalledWith(1, "a");
    expect(onChange).toHaveBeenNthCalledWith(2, "b");
    expect(onChange).toHaveBeenNthCalledWith(3, "c");
  });

  it("fires onSubmit on Enter with current value", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <SearchInput
        value="abc"
        onChange={() => {}}
        onSubmit={onSubmit}
        placeholder="Search"
      />,
    );
    await user.type(screen.getByRole("searchbox"), "{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("abc");
  });

  it("clears the value AND fires onSubmit('') on Escape", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SearchInput
        value="abc"
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder="Search"
      />,
    );
    await user.type(screen.getByRole("searchbox"), "{Escape}");
    expect(onChange).toHaveBeenCalledWith("");
    expect(onSubmit).toHaveBeenCalledWith("");
  });

  it("shows a clear button when value is non-empty", () => {
    render(
      <SearchInput
        value="abc"
        onChange={() => {}}
        placeholder="Search"
      />,
    );
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
  });

  it("hides the clear button when value is empty", () => {
    render(
      <SearchInput value="" onChange={() => {}} placeholder="Search" />,
    );
    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();
  });

  it("clear button fires onChange('') and onSubmit('') when present", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SearchInput
        value="abc"
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder="Search"
      />,
    );
    await user.click(screen.getByLabelText("Clear search"));
    expect(onChange).toHaveBeenCalledWith("");
    expect(onSubmit).toHaveBeenCalledWith("");
  });

  it("renders a datalist of suggestions and links the input via `list` when supplied", () => {
    render(
      <SearchInput
        value=""
        onChange={() => {}}
        placeholder="Search"
        id="inv"
        suggestions={["Mining", "Renewable Energy", "NSW"]}
      />,
    );
    // An <input> with a `list` attribute exposes the combobox role (ARIA), not searchbox.
    expect(screen.getByRole("combobox")).toHaveAttribute("list", "inv-suggestions");
    const datalist = document.getElementById("inv-suggestions") as HTMLDataListElement;
    expect(datalist).toBeInTheDocument();
    const options = Array.from(datalist.querySelectorAll("option"));
    expect(options.map((o) => o.value)).toEqual(["Mining", "Renewable Energy", "NSW"]);
  });

  it("renders no datalist and no `list` attribute when suggestions are omitted or empty", () => {
    const { rerender } = render(
      <SearchInput value="" onChange={() => {}} placeholder="Search" id="x" />,
    );
    expect(screen.getByRole("searchbox")).not.toHaveAttribute("list");
    expect(document.getElementById("x-suggestions")).toBeNull();
    rerender(
      <SearchInput value="" onChange={() => {}} placeholder="Search" id="x" suggestions={[]} />,
    );
    expect(screen.getByRole("searchbox")).not.toHaveAttribute("list");
    expect(document.getElementById("x-suggestions")).toBeNull();
  });
});
