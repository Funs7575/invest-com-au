import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "../setup";
import PostcodeAutocomplete, {
  type PostcodeResult,
} from "@/components/directory/PostcodeAutocomplete";

const MOCK_HITS: PostcodeResult[] = [
  { postcode: "2000", locality: "Sydney", state: "NSW", latitude: -33.86, longitude: 151.21 },
  { postcode: "2010", locality: "Surry Hills", state: "NSW", latitude: -33.88, longitude: 151.21 },
];

function makeSearch(hits: PostcodeResult[] = MOCK_HITS) {
  return vi.fn().mockResolvedValue(hits);
}

describe("PostcodeAutocomplete", () => {
  it("renders the input with the supplied placeholder + ariaLabel", () => {
    render(
      <PostcodeAutocomplete
        selected={null}
        onSelect={() => {}}
        search={makeSearch()}
        placeholder="Where in Australia?"
        ariaLabel="Search location"
      />,
    );
    const input = screen.getByLabelText("Search location");
    expect(input).toHaveAttribute("placeholder", "Where in Australia?");
  });

  it("hydrates the input from a pre-selected result", () => {
    render(
      <PostcodeAutocomplete
        selected={MOCK_HITS[0]}
        onSelect={() => {}}
        search={makeSearch()}
      />,
    );
    expect(screen.getByDisplayValue(/Sydney, NSW/)).toBeInTheDocument();
  });

  it("fires search and shows results when user types ≥ 2 chars", async () => {
    const user = userEvent.setup();
    const search = makeSearch();
    render(
      <PostcodeAutocomplete
        selected={null}
        onSelect={() => {}}
        search={search}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole("textbox"), "Sy");
    await waitFor(() => {
      expect(search).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Sydney, NSW/ })).toBeInTheDocument();
    });
  });

  it("does NOT search for queries shorter than 2 chars", async () => {
    const user = userEvent.setup();
    const search = makeSearch();
    render(
      <PostcodeAutocomplete
        selected={null}
        onSelect={() => {}}
        search={search}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole("textbox"), "S");
    // Wait long enough that any debounced call would have fired
    await new Promise((r) => setTimeout(r, 50));
    expect(search).not.toHaveBeenCalled();
  });

  it("selecting an option fires onSelect with the full result + closes the listbox", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PostcodeAutocomplete
        selected={null}
        onSelect={onSelect}
        search={makeSearch()}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole("textbox"), "Sy");
    const option = await screen.findByRole("option", { name: /Sydney, NSW/ });
    await user.click(option);
    expect(onSelect).toHaveBeenCalledWith(MOCK_HITS[0]);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clear button fires onSelect(null) and empties the input", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <PostcodeAutocomplete
        selected={MOCK_HITS[0]}
        onSelect={onSelect}
        search={makeSearch()}
      />,
    );
    await user.click(screen.getByLabelText("Clear location"));
    expect(onSelect).toHaveBeenCalledWith(null);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("Escape closes the dropdown", async () => {
    const user = userEvent.setup();
    render(
      <PostcodeAutocomplete
        selected={null}
        onSelect={() => {}}
        search={makeSearch()}
        debounceMs={0}
      />,
    );
    await user.type(screen.getByRole("textbox"), "Sy");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
