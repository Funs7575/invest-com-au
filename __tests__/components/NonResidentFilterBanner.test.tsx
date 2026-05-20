import { describe, it, expect } from "vitest";
import { render, screen, userEvent } from "./setup";
import NonResidentFilterBanner from "@/components/NonResidentFilterBanner";

describe("NonResidentFilterBanner", () => {
  it("renders nothing when nonResidentCount is 0", () => {
    const { container } = render(
      <NonResidentFilterBanner total={50} nonResidentCount={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders headline with count comparison when data is present", () => {
    render(<NonResidentFilterBanner total={50} nonResidentCount={12} />);
    expect(
      screen.getByText(/12 of 50 platforms accept non-residents/),
    ).toBeInTheDocument();
  });

  it("links to /foreign-investment/shares for the default 'shares' vertical", () => {
    render(<NonResidentFilterBanner total={50} nonResidentCount={12} />);
    expect(
      screen.getByRole("link", { name: /non-resident friendly platforms/ }),
    ).toHaveAttribute("href", "/foreign-investment/shares");
  });

  it("links to /foreign-investment/crypto when vertical='crypto'", () => {
    render(
      <NonResidentFilterBanner
        total={50}
        nonResidentCount={12}
        vertical="crypto"
      />,
    );
    expect(
      screen.getByRole("link", { name: /non-resident friendly platforms/ }),
    ).toHaveAttribute("href", "/foreign-investment/crypto");
  });

  it("links to /foreign-investment/savings when vertical='savings'", () => {
    render(
      <NonResidentFilterBanner
        total={50}
        nonResidentCount={12}
        vertical="savings"
      />,
    );
    expect(
      screen.getByRole("link", { name: /non-resident friendly platforms/ }),
    ).toHaveAttribute("href", "/foreign-investment/savings");
  });

  it("aliases 'cfd' vertical to /foreign-investment/shares (no dedicated CFD guide yet)", () => {
    render(
      <NonResidentFilterBanner
        total={50}
        nonResidentCount={12}
        vertical="cfd"
      />,
    );
    expect(
      screen.getByRole("link", { name: /non-resident friendly platforms/ }),
    ).toHaveAttribute("href", "/foreign-investment/shares");
  });

  it("dismiss button removes the banner from the DOM", async () => {
    const user = userEvent.setup();
    render(<NonResidentFilterBanner total={50} nonResidentCount={12} />);
    expect(screen.getByText(/non-residents/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/non-residents/)).not.toBeInTheDocument();
  });
});
