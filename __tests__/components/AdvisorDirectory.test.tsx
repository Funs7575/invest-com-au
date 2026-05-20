import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "./setup";

vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`} />
  ),
}));

import AdvisorDirectory from "@/components/AdvisorDirectory";

describe("AdvisorDirectory — initial (property tab)", () => {
  it("renders the property headline", () => {
    render(<AdvisorDirectory />);
    expect(
      screen.getByRole("heading", { name: /Find a Verified/i }),
    ).toHaveTextContent("Property Expert");
  });

  it("renders the property body copy + section heading", () => {
    render(<AdvisorDirectory />);
    expect(
      screen.getByRole("heading", { name: "Browse Property Professionals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/buyer's agents, mortgage brokers/i),
    ).toBeInTheDocument();
  });

  it("renders the property CTA pointing at /find-advisor", () => {
    render(<AdvisorDirectory />);
    const cta = screen.getByRole("link", {
      name: /Match Me With a Property Expert/,
    });
    expect(cta).toHaveAttribute("href", "/find-advisor");
  });

  it("lists property professional types in the bottom strip", () => {
    render(<AdvisorDirectory />);
    expect(screen.getByText("Buyer's Agents")).toBeInTheDocument();
    expect(screen.getByText("Mortgage Brokers")).toBeInTheDocument();
    expect(screen.getByText("Property Advisors")).toBeInTheDocument();
  });

  it("uses the building icon for the property branch hero", () => {
    render(<AdvisorDirectory />);
    expect(screen.getByTestId("icon-building")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-users")).not.toBeInTheDocument();
  });
});

describe("AdvisorDirectory — wealth tab", () => {
  it("clicking 'I want to grow wealth' swaps the headline", async () => {
    const user = userEvent.setup();
    render(<AdvisorDirectory />);
    await user.click(
      screen.getByRole("button", { name: "I want to grow wealth" }),
    );
    expect(
      screen.getByRole("heading", { name: /Find a Verified/i }),
    ).toHaveTextContent("Financial Advisor");
  });

  it("swaps the section heading + CTA to the financial branch", async () => {
    const user = userEvent.setup();
    render(<AdvisorDirectory />);
    await user.click(
      screen.getByRole("button", { name: "I want to grow wealth" }),
    );
    expect(
      screen.getByRole("heading", { name: "Browse Financial Professionals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Match Me With a Financial Advisor/ }),
    ).toBeInTheDocument();
  });

  it("swaps the bottom-strip professional types", async () => {
    const user = userEvent.setup();
    render(<AdvisorDirectory />);
    await user.click(
      screen.getByRole("button", { name: "I want to grow wealth" }),
    );
    expect(screen.getByText("Financial Planners")).toBeInTheDocument();
    expect(screen.getByText("SMSF Accountants")).toBeInTheDocument();
    expect(screen.getByText("Wealth Managers")).toBeInTheDocument();
    expect(screen.queryByText("Buyer's Agents")).not.toBeInTheDocument();
  });

  it("uses the users icon for the wealth branch hero", async () => {
    const user = userEvent.setup();
    render(<AdvisorDirectory />);
    await user.click(
      screen.getByRole("button", { name: "I want to grow wealth" }),
    );
    expect(screen.getByTestId("icon-users")).toBeInTheDocument();
    expect(screen.queryByTestId("icon-building")).not.toBeInTheDocument();
  });

  it("can switch back to the property tab", async () => {
    const user = userEvent.setup();
    render(<AdvisorDirectory />);
    await user.click(
      screen.getByRole("button", { name: "I want to grow wealth" }),
    );
    await user.click(
      screen.getByRole("button", { name: "I want property help" }),
    );
    expect(
      screen.getByRole("heading", { name: "Browse Property Professionals" }),
    ).toBeInTheDocument();
  });
});

describe("AdvisorDirectory — shared trust signals", () => {
  it("renders the 'Free · No obligation' footnote", () => {
    render(<AdvisorDirectory />);
    expect(
      screen.getByText(/Free · No obligation · Takes 60 seconds/),
    ).toBeInTheDocument();
  });

  it("renders all three trust-signal rows on both tabs", async () => {
    const user = userEvent.setup();
    render(<AdvisorDirectory />);
    expect(
      screen.getByText("Licensed professionals directory"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Contact professionals directly"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Public register details where available"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "I want to grow wealth" }),
    );
    // Same trust signals — re-asserted to confirm they aren't tab-gated.
    expect(
      screen.getByText("Licensed professionals directory"),
    ).toBeInTheDocument();
  });
});
