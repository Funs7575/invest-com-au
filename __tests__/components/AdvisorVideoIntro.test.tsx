import { describe, it, expect } from "vitest";
import { render, screen, userEvent } from "./setup";
import AdvisorVideoIntro from "@/components/AdvisorVideoIntro";

describe("AdvisorVideoIntro — initial state (poster + play button)", () => {
  it("renders the play button with an advisor-personalised label", () => {
    render(
      <AdvisorVideoIntro
        videoUrl="https://youtu.be/abc123"
        advisorName="Jane Doe"
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Play Jane Doe's introduction video",
      }),
    ).toBeInTheDocument();
  });

  it("does not mount the iframe until the user clicks play", () => {
    const { container } = render(
      <AdvisorVideoIntro
        videoUrl="https://youtu.be/abc123"
        advisorName="Jane"
      />,
    );
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("shows the YouTube hqdefault thumbnail when no poster is supplied", () => {
    render(
      <AdvisorVideoIntro
        videoUrl="https://www.youtube.com/watch?v=zXyAbCdEfGh"
        advisorName="Jane"
      />,
    );
    const img = screen.getByAltText("Jane video thumbnail");
    expect(img).toHaveAttribute(
      "src",
      "https://img.youtube.com/vi/zXyAbCdEfGh/hqdefault.jpg",
    );
  });

  it("prefers the explicit posterUrl over the YouTube auto-thumbnail", () => {
    render(
      <AdvisorVideoIntro
        videoUrl="https://www.youtube.com/watch?v=abc123"
        posterUrl="/custom-poster.jpg"
        advisorName="Jane"
      />,
    );
    expect(screen.getByAltText("Jane video thumbnail")).toHaveAttribute(
      "src",
      "/custom-poster.jpg",
    );
  });

  it("renders the solid placeholder when there is no poster + no YouTube thumbnail (Vimeo)", () => {
    const { container } = render(
      <AdvisorVideoIntro
        videoUrl="https://vimeo.com/12345"
        advisorName="Jane"
      />,
    );
    // No <img> from poster path; the slate-800 div should be present.
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".bg-slate-800")).not.toBeNull();
  });
});

describe("AdvisorVideoIntro — playing state", () => {
  it("clicking play swaps the button for an iframe", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorVideoIntro
        videoUrl="https://youtu.be/abc123"
        advisorName="Jane Doe"
      />,
    );
    const button = screen.getByRole("button", {
      name: "Play Jane Doe's introduction video",
    });
    await user.click(button);

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe).toHaveAttribute("title", "Jane Doe introduction video");
    expect(
      screen.queryByRole("button", {
        name: /Play .* introduction video/,
      }),
    ).not.toBeInTheDocument();
  });

  it("iframe carries the autoplay + rel=0 YouTube embed URL", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorVideoIntro
        videoUrl="https://www.youtube.com/watch?v=zXyAbCdEfGh"
        advisorName="Jane"
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /Play .* introduction video/ }),
    );
    const iframe = document.querySelector("iframe");
    expect(iframe).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/zXyAbCdEfGh?autoplay=1&rel=0",
    );
  });
});

describe("AdvisorVideoIntro — URL parsing", () => {
  it("parses youtu.be short links into the embed URL", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorVideoIntro videoUrl="https://youtu.be/AAA111" advisorName="J" />,
    );
    await user.click(screen.getByRole("button"));
    expect(document.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/AAA111?autoplay=1&rel=0",
    );
  });

  it("parses already-embed YouTube URLs", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorVideoIntro
        videoUrl="https://www.youtube.com/embed/EMBEDID"
        advisorName="J"
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(document.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/EMBEDID?autoplay=1&rel=0",
    );
  });

  it("parses bare vimeo.com/<id> URLs to the player URL with autoplay", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorVideoIntro
        videoUrl="https://vimeo.com/123456"
        advisorName="J"
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(document.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://player.vimeo.com/video/123456?autoplay=1",
    );
  });

  it("parses vimeo.com/video/<id> URLs", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorVideoIntro
        videoUrl="https://vimeo.com/video/987654"
        advisorName="J"
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(document.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://player.vimeo.com/video/987654?autoplay=1",
    );
  });

  it("falls through to the raw URL for unknown providers", async () => {
    const user = userEvent.setup();
    render(
      <AdvisorVideoIntro
        videoUrl="https://other-host.example/clip.mp4"
        advisorName="J"
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(document.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://other-host.example/clip.mp4",
    );
  });
});
