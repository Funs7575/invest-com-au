import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";

vi.mock("@/lib/image-blur", () => ({
  blurDataURL: () => "data:image/png;base64,fake",
}));

import AuthorByline from "@/components/AuthorByline";
import type { TeamMember } from "@/lib/types";

function makeMember(over: Partial<TeamMember>): TeamMember {
  return {
    slug: "jane-doe",
    full_name: "Jane Doe",
    role: "editor",
    ...over,
  } as TeamMember;
}

describe("AuthorByline — defaults", () => {
  it("renders the default 'Market Research Team' name when no props are given", () => {
    render(<AuthorByline />);
    expect(screen.getByText("Market Research Team")).toBeInTheDocument();
    expect(screen.getByText("Invest.com.au")).toBeInTheDocument();
  });

  it("falls back to initials avatar when no author is supplied", () => {
    render(<AuthorByline name="Jane Doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders 'Data verified: …' when verifiedDate is provided", () => {
    render(<AuthorByline name="Jane" verifiedDate="2026-03-15" />);
    expect(
      screen.getByText("Data verified: 2026-03-15"),
    ).toBeInTheDocument();
  });
});

describe("AuthorByline — author (structured) prop", () => {
  it("uses author.full_name in preference to the flat name", () => {
    render(
      <AuthorByline
        name="Old Name"
        author={makeMember({ full_name: "Structured Name" })}
      />,
    );
    expect(screen.getByText("Structured Name")).toBeInTheDocument();
    expect(screen.queryByText("Old Name")).not.toBeInTheDocument();
  });

  it("wraps the name in a link to /authors/<slug> when slug is present", () => {
    render(
      <AuthorByline
        author={makeMember({ slug: "jane-doe", full_name: "Jane Doe" })}
      />,
    );
    const link = screen.getByRole("link", { name: "Jane Doe" });
    expect(link).toHaveAttribute("href", "/authors/jane-doe");
  });

  it("renders the avatar image when author.avatar_url is set", () => {
    render(
      <AuthorByline
        author={makeMember({
          full_name: "Jane Doe",
          avatar_url: "/team/jane.jpg",
        })}
      />,
    );
    expect(screen.getByAltText("Jane Doe")).toHaveAttribute(
      "src",
      "/team/jane.jpg",
    );
  });
});

describe("AuthorByline — social links", () => {
  it("renders a LinkedIn link with target=_blank and a labelled icon when provided", () => {
    render(<AuthorByline name="Jane" linkedinUrl="https://linkedin.com/in/jane" />);
    const link = screen.getByRole("link", { name: "Jane on LinkedIn" });
    expect(link).toHaveAttribute("href", "https://linkedin.com/in/jane");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders a Twitter link with the right label when provided", () => {
    render(<AuthorByline name="Jane" twitterUrl="https://x.com/jane" />);
    const link = screen.getByRole("link", { name: "Jane on Twitter" });
    expect(link).toHaveAttribute("href", "https://x.com/jane");
  });

  it("prefers author.linkedin_url over the flat linkedinUrl", () => {
    render(
      <AuthorByline
        linkedinUrl="https://linkedin.com/in/flat"
        author={makeMember({
          full_name: "Jane Doe",
          linkedin_url: "https://linkedin.com/in/structured",
        })}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Jane Doe on LinkedIn" }),
    ).toHaveAttribute("href", "https://linkedin.com/in/structured");
  });

  it("renders no social icons when neither URL is provided", () => {
    const { container } = render(<AuthorByline name="Jane" />);
    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });
});

describe("AuthorByline — reviewer", () => {
  it("renders the reviewer line with a slug-link and role label", () => {
    render(
      <AuthorByline
        author={makeMember({ full_name: "Author" })}
        reviewer={makeMember({
          slug: "rev-jones",
          full_name: "Rev Jones",
          role: "editor",
        })}
      />,
    );
    expect(screen.getByText("Reviewed by:")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Rev Jones" }),
    ).toHaveAttribute("href", "/reviewers/rev-jones");
  });

  it("renders the reviewedAt date when supplied", () => {
    render(
      <AuthorByline
        reviewer={makeMember({ full_name: "Rev Jones" })}
        reviewedAt="2026-04-10"
      />,
    );
    // formatDate(long) → "10 April 2026"
    expect(screen.getByText(/10 April 2026/)).toBeInTheDocument();
  });
});

describe("AuthorByline — changelog", () => {
  it("renders up to 3 changelog entries with formatted dates", () => {
    render(
      <AuthorByline
        changelog={[
          { date: "2026-01-01", summary: "First update" },
          { date: "2026-02-01", summary: "Second update" },
          { date: "2026-03-01", summary: "Third update" },
          { date: "2026-04-01", summary: "Should NOT appear" },
        ]}
      />,
    );
    expect(screen.getByText(/First update/)).toBeInTheDocument();
    expect(screen.getByText(/Second update/)).toBeInTheDocument();
    expect(screen.getByText(/Third update/)).toBeInTheDocument();
    expect(screen.queryByText(/Should NOT appear/)).not.toBeInTheDocument();
  });

  it("renders nothing changelog-related when none is supplied", () => {
    const { container } = render(<AuthorByline name="Jane" />);
    expect(container.textContent).not.toMatch(/—/);
  });
});

describe("AuthorByline — methodology footer", () => {
  it("renders the three policy links when showMethodologyLink is true", () => {
    render(<AuthorByline showMethodologyLink />);
    expect(
      screen.getByRole("link", { name: "How we make money" }),
    ).toHaveAttribute("href", "/how-we-earn");
    expect(
      screen.getByRole("link", { name: "Methodology" }),
    ).toHaveAttribute("href", "/methodology");
    expect(
      screen.getByRole("link", { name: "Editorial policy" }),
    ).toHaveAttribute("href", "/editorial-policy");
  });

  it("does not render policy links by default", () => {
    render(<AuthorByline />);
    expect(
      screen.queryByRole("link", { name: "Methodology" }),
    ).not.toBeInTheDocument();
  });
});

describe("AuthorByline — dark variant", () => {
  it("applies white text classes to the author name in dark variant", () => {
    render(<AuthorByline name="Jane" variant="dark" />);
    const name = screen.getByText("Jane");
    expect(name.className).toContain("text-white");
  });
});
