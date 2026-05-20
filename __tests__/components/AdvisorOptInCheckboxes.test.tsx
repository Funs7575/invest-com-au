import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "./setup";

vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`} />
  ),
}));

import {
  AdvisorOptInCheckboxes,
  DEFAULT_ADVISOR_OPT_INS,
} from "@/components/AdvisorOptInCheckboxes";
import type { ProfessionalType } from "@/lib/types";

describe("AdvisorOptInCheckboxes — default layout", () => {
  it("renders default heading and subheading", () => {
    render(<AdvisorOptInCheckboxes selected={[]} onChange={() => {}} />);
    expect(screen.getByText("Want help with this?")).toBeInTheDocument();
    expect(
      screen.getByText(/Tick any that apply/),
    ).toBeInTheDocument();
  });

  it("renders one checkbox per default option (8 total)", () => {
    render(<AdvisorOptInCheckboxes selected={[]} onChange={() => {}} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(
      DEFAULT_ADVISOR_OPT_INS.length,
    );
  });

  it("renders the privacy-policy footnote with a link", () => {
    render(<AdvisorOptInCheckboxes selected={[]} onChange={() => {}} />);
    expect(
      screen.getByRole("link", { name: "privacy policy" }),
    ).toHaveAttribute("href", "/privacy");
  });
});

describe("AdvisorOptInCheckboxes — interaction", () => {
  it("toggles a single option via the parent onChange handler", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdvisorOptInCheckboxes selected={[]} onChange={onChange} />,
    );
    const tax = screen.getByRole("checkbox", {
      name: /Tax agent \/ accountant/,
    });
    await user.click(tax);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(["tax_agent"]);
  });

  it("appends to the existing selection when toggling a new option", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdvisorOptInCheckboxes
        selected={["mortgage_broker"]}
        onChange={onChange}
      />,
    );
    await user.click(
      screen.getByRole("checkbox", { name: /Buyer's agent/ }),
    );
    expect(onChange).toHaveBeenCalledWith([
      "mortgage_broker",
      "buyers_agent",
    ]);
  });

  it("removes an option when it is already selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdvisorOptInCheckboxes
        selected={["mortgage_broker", "buyers_agent"]}
        onChange={onChange}
      />,
    );
    await user.click(
      screen.getByRole("checkbox", { name: /Mortgage broker/ }),
    );
    expect(onChange).toHaveBeenCalledWith(["buyers_agent"]);
  });

  it("Select all → sends all option types to onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AdvisorOptInCheckboxes selected={[]} onChange={onChange} />);
    await user.click(
      screen.getByRole("button", { name: "Select all" }),
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toEqual(
      DEFAULT_ADVISOR_OPT_INS.map((o) => o.type),
    );
  });

  it("Clear all → sends [] when every option is currently selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdvisorOptInCheckboxes
        selected={DEFAULT_ADVISOR_OPT_INS.map((o) => o.type)}
        onChange={onChange}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Clear all" }),
    );
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("renders the live count when at least one is selected", () => {
    render(
      <AdvisorOptInCheckboxes
        selected={["tax_agent", "mortgage_broker"]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("hides the count when nothing is selected", () => {
    render(<AdvisorOptInCheckboxes selected={[]} onChange={() => {}} />);
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
  });

  it("reflects the selected prop on the rendered checkboxes", () => {
    render(
      <AdvisorOptInCheckboxes
        selected={["tax_agent"]}
        onChange={() => {}}
      />,
    );
    const tax = screen.getByRole("checkbox", {
      name: /Tax agent \/ accountant/,
    });
    expect(tax).toBeChecked();

    const mortgage = screen.getByRole("checkbox", {
      name: /Mortgage broker/,
    });
    expect(mortgage).not.toBeChecked();
  });
});

describe("AdvisorOptInCheckboxes — collapse", () => {
  it("collapse button hides the checkbox list and updates aria-expanded", async () => {
    const user = userEvent.setup();
    render(<AdvisorOptInCheckboxes selected={[]} onChange={() => {}} />);
    const collapseBtn = screen.getByRole("button", {
      name: "Collapse options",
    });
    expect(collapseBtn).toHaveAttribute("aria-expanded", "true");

    await user.click(collapseBtn);

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    // The same button now becomes "Expand options".
    const expandBtn = screen.getByRole("button", {
      name: "Expand options",
    });
    expect(expandBtn).toHaveAttribute("aria-expanded", "false");
  });
});

describe("AdvisorOptInCheckboxes — overrides", () => {
  it("uses a custom heading and subheading when provided", () => {
    render(
      <AdvisorOptInCheckboxes
        selected={[]}
        onChange={() => {}}
        heading="Need a specialist?"
        subheading="Pick any."
      />,
    );
    expect(screen.getByText("Need a specialist?")).toBeInTheDocument();
    expect(screen.getByText("Pick any.")).toBeInTheDocument();
  });

  it("renders the supplied options instead of the defaults", () => {
    const opts = [
      {
        type: "mortgage_broker" as ProfessionalType,
        label: "ONLY broker",
        description: "Just this one",
        icon: "x",
      },
    ];
    render(
      <AdvisorOptInCheckboxes
        selected={[]}
        onChange={() => {}}
        options={opts}
      />,
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByText("ONLY broker")).toBeInTheDocument();
  });
});
