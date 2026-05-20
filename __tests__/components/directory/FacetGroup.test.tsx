import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "../setup";
import FacetGroup from "@/components/directory/FacetGroup";

const OPTIONS = [
  { value: "smsf", label: "SMSF specialist" },
  { value: "tax", label: "Tax agent" },
  { value: "property", label: "Property advisor" },
];

describe("FacetGroup", () => {
  it("renders one checkbox per option with the supplied legend", () => {
    render(
      <FacetGroup
        label="Specialty"
        options={OPTIONS}
        selected={new Set<string>()}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Specialty")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("checks options whose value is in the selected set", () => {
    render(
      <FacetGroup
        label="Specialty"
        options={OPTIONS}
        selected={new Set(["tax"])}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText(/Tax agent/)).toBeChecked();
    expect(screen.getByLabelText(/SMSF specialist/)).not.toBeChecked();
  });

  it("emits a new Set with the toggled value on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FacetGroup
        label="Specialty"
        options={OPTIONS}
        selected={new Set(["tax"])}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText(/Property advisor/));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Set<string>;
    expect(Array.from(next).sort()).toEqual(["property", "tax"]);
  });

  it("disables zero-count options that aren't currently selected", () => {
    render(
      <FacetGroup
        label="Specialty"
        options={OPTIONS}
        selected={new Set(["smsf"])}
        counts={{ smsf: 0, tax: 5, property: 0 }}
        onChange={() => {}}
      />,
    );
    // smsf is selected → keep enabled even with count 0
    expect(screen.getByLabelText(/SMSF specialist/)).not.toBeDisabled();
    // property is not selected and count is 0 → disabled
    expect(screen.getByLabelText(/Property advisor/)).toBeDisabled();
  });

  it("hides zero-count options entirely when hideZeroCounts is set", () => {
    render(
      <FacetGroup
        label="Specialty"
        options={OPTIONS}
        selected={new Set<string>()}
        counts={{ smsf: 0, tax: 5, property: 0 }}
        onChange={() => {}}
        hideZeroCounts
      />,
    );
    expect(screen.queryByLabelText(/SMSF specialist/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Tax agent/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Property advisor/)).not.toBeInTheDocument();
  });

  it("renders nothing when every option is filtered out", () => {
    const { container } = render(
      <FacetGroup
        label="Specialty"
        options={OPTIONS}
        selected={new Set<string>()}
        counts={{ smsf: 0, tax: 0, property: 0 }}
        onChange={() => {}}
        hideZeroCounts
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
