import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import VerifiedClientBadge from "@/components/VerifiedClientBadge";

describe("VerifiedClientBadge", () => {
  it("renders nothing when isVerified is false", () => {
    const { container } = render(<VerifiedClientBadge isVerified={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the Verified Client badge when isVerified=true", () => {
    render(<VerifiedClientBadge isVerified />);
    expect(screen.getByText("Verified Client")).toBeInTheDocument();
  });

  it("uses base aria-label when verifiedVia is omitted", () => {
    render(<VerifiedClientBadge isVerified />);
    expect(screen.getByLabelText("Verified Client")).toBeInTheDocument();
  });

  it("appends the verifiedVia source to the aria-label, with underscores → spaces", () => {
    render(
      <VerifiedClientBadge isVerified verifiedVia="advisor_enquiry" />,
    );
    expect(
      screen.getByLabelText("Verified Client (advisor enquiry)"),
    ).toBeInTheDocument();
  });

  it("attaches the tooltip text via title attribute for hover discovery", () => {
    render(<VerifiedClientBadge isVerified />);
    const badge = screen.getByText("Verified Client").closest("span");
    expect(badge?.getAttribute("title")).toContain(
      "This reviewer used an enquiry",
    );
  });
});
