import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "./setup";

// Controllable mock for the keyword-linking engine. Declared via vi.hoisted so
// it can be referenced inside the (hoisted) vi.mock factory below.
const { mockSplitByLinks } = vi.hoisted(() => ({
  mockSplitByLinks: vi.fn(),
}));

vi.mock("@/lib/keyword-linking", () => ({
  splitByLinks: mockSplitByLinks,
}));

import LinkifiedText from "@/components/LinkifiedText";

describe("LinkifiedText", () => {
  beforeEach(() => {
    mockSplitByLinks.mockReset();
  });

  it("returns null for empty text", () => {
    const { container } = render(<LinkifiedText text="" />);
    expect(container.firstChild).toBeNull();
    // Empty text short-circuits before ever consulting the linker.
    expect(mockSplitByLinks).not.toHaveBeenCalled();
  });

  it("renders raw text and never linkifies when disabled", () => {
    const { container } = render(
      <LinkifiedText text="Buy CommSec shares today" disabled />,
    );

    // Raw text rendered directly inside the wrapper div.
    expect(container.textContent).toBe("Buy CommSec shares today");
    // No links injected at all.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    // Kill-switch must bypass the linking engine entirely.
    expect(mockSplitByLinks).not.toHaveBeenCalled();
  });

  it("renders link objects as <a> and string parts as <span>", () => {
    mockSplitByLinks.mockReturnValue([
      "Open a ",
      {
        href: "/brokers/commsec",
        label: "CommSec",
        title: "CommSec review",
        rel: "nofollow",
      },
      " account",
    ]);

    render(<LinkifiedText text="Open a CommSec account" />);

    const link = screen.getByRole("link", { name: "CommSec" });
    expect(link).toHaveAttribute("href", "/brokers/commsec");
    expect(link).toHaveAttribute("title", "CommSec review");
    expect(link).toHaveAttribute("rel", "nofollow");

    // The string segments render as plain text around the link.
    expect(screen.getByText("Open a")).toBeInTheDocument();
    expect(screen.getByText("account")).toBeInTheDocument();
  });

  it("renders a skipped href's link as a plain span (no anchor)", () => {
    mockSplitByLinks.mockReturnValue([
      "Read the ",
      { href: "/brokers/commsec", label: "CommSec", title: "t", rel: "" },
      " and ",
      { href: "/brokers/stake", label: "Stake", title: "t2", rel: "" },
      " reviews",
    ]);

    render(
      <LinkifiedText
        text="Read the CommSec and Stake reviews"
        skipHrefs={["/brokers/commsec"]}
      />,
    );

    // The skipped href must NOT be a link...
    expect(
      screen.queryByRole("link", { name: "CommSec" }),
    ).not.toBeInTheDocument();
    // ...but its label still appears as text.
    expect(screen.getByText("CommSec")).toBeInTheDocument();

    // The non-skipped href stays a real link.
    const stake = screen.getByRole("link", { name: "Stake" });
    expect(stake).toHaveAttribute("href", "/brokers/stake");

    // Exactly one link survives.
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("forwards text, maxLinks, and pillarPath to splitByLinks", () => {
    mockSplitByLinks.mockReturnValue(["plain"]);

    render(
      <LinkifiedText text="some prose" maxLinks={3} pillarPath="/smsf" />,
    );

    expect(mockSplitByLinks).toHaveBeenCalledTimes(1);
    expect(mockSplitByLinks).toHaveBeenCalledWith("some prose", 3, "/smsf");
  });

  it("appends className to the wrapper div", () => {
    mockSplitByLinks.mockReturnValue(["hello"]);

    const { container } = render(
      <LinkifiedText text="hello" className="my-custom-class" />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper).toHaveClass("my-custom-class");
  });
});
