import { describe, it, expect } from "vitest";
import { render, screen, userEvent } from "./setup";
import AdvisorCalendarEmbed from "@/components/AdvisorCalendarEmbed";

describe("AdvisorCalendarEmbed — unsupported booking link", () => {
  it("renders a plain anchor with target=_blank when the URL is not Calendly or Cal.com", () => {
    render(
      <AdvisorCalendarEmbed
        bookingLink="https://acuity.example.com/book/jane"
        advisorName="Jane"
      />,
    );
    const link = screen.getByRole("link", {
      name: /Book Free consultation/i,
    });
    expect(link).toHaveAttribute("href", "https://acuity.example.com/book/jane");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("uses the custom consultationLabel in the unsupported-link CTA", () => {
    render(
      <AdvisorCalendarEmbed
        bookingLink="https://acuity.example.com/book/jane"
        advisorName="Jane"
        consultationLabel="15-min intro call"
      />,
    );
    expect(
      screen.getByRole("link", { name: /Book 15-min intro call/i }),
    ).toBeInTheDocument();
  });

  it("does NOT render an iframe for unsupported links", () => {
    const { container } = render(
      <AdvisorCalendarEmbed
        bookingLink="https://other.example/book"
        advisorName="Jane"
      />,
    );
    expect(container.querySelector("iframe")).toBeNull();
  });
});

describe("AdvisorCalendarEmbed — Calendly", () => {
  it("renders the open-calendar button initially (no iframe yet)", () => {
    const { container } = render(
      <AdvisorCalendarEmbed
        bookingLink="https://calendly.com/jane/30min"
        advisorName="Jane"
      />,
    );
    expect(
      screen.getByRole("button", { name: /Book Free consultation/i }),
    ).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("clicking the button opens the iframe with the Calendly embed params", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorCalendarEmbed
        bookingLink="https://calendly.com/jane/30min"
        advisorName="Jane"
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /Book Free consultation/i }),
    );
    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(
      "https://calendly.com/jane/30min?embed_type=Inline&embed_domain=invest.com.au&primary_color=1d4ed8&hide_gdpr_banner=1",
    );
    expect(iframe).toHaveAttribute("title", "Book a time with Jane");
    expect(iframe).toHaveAttribute("loading", "lazy");
  });

  it("strips the original query string before appending embed params", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorCalendarEmbed
        bookingLink="https://calendly.com/jane/30min?utm_source=email"
        advisorName="Jane"
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://calendly.com/jane/30min?embed_type=Inline&embed_domain=invest.com.au&primary_color=1d4ed8&hide_gdpr_banner=1",
    );
  });

  it("close button returns the embedded UI to the open-button state", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorCalendarEmbed
        bookingLink="https://calendly.com/jane/30min"
        advisorName="Jane"
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /Book Free consultation/i }),
    );
    expect(document.querySelector("iframe")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Close calendar" }));
    expect(document.querySelector("iframe")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Book Free consultation/i }),
    ).toBeInTheDocument();
  });

  it("renders the 'Book with <advisor>' header when open", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorCalendarEmbed
        bookingLink="https://calendly.com/jane/30min"
        advisorName="Dr. Jane"
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Book with Dr. Jane")).toBeInTheDocument();
  });
});

describe("AdvisorCalendarEmbed — Cal.com", () => {
  it("clicking the button opens the iframe with the Cal.com embed=true URL", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorCalendarEmbed
        bookingLink="https://cal.com/jane/intro"
        advisorName="Jane"
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /Book Free consultation/i }),
    );
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://cal.com/jane/intro?embed=true",
    );
  });

  it("strips the original query string from Cal.com URLs", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorCalendarEmbed
        bookingLink="https://cal.com/jane/intro?ref=site"
        advisorName="Jane"
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://cal.com/jane/intro?embed=true",
    );
  });
});
