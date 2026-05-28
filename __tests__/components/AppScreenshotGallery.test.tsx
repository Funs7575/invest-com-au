import { describe, it, expect } from "vitest";
import { render, screen, userEvent } from "./setup";
import AppScreenshotGallery from "@/components/AppScreenshotGallery";

const shots = [
  { url: "/s1.jpg", label: "Dashboard" },
  { url: "/s2.jpg", label: "Portfolio" },
  { url: "/s3.jpg", label: null },
];

describe("AppScreenshotGallery", () => {
  it("returns null when screenshots is empty", () => {
    const { container } = render(
      <AppScreenshotGallery screenshots={[]} brokerName="Acme" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a heading with the broker name", () => {
    render(<AppScreenshotGallery screenshots={shots} brokerName="Acme" />);
    expect(
      screen.getByText("Acme Platform Screenshots"),
    ).toBeInTheDocument();
  });

  it("renders one button per screenshot", () => {
    render(<AppScreenshotGallery screenshots={shots} brokerName="Acme" />);
    const buttons = screen
      .getAllByRole("listitem")
      .filter((el) => el.tagName === "BUTTON");
    expect(buttons).toHaveLength(3);
  });

  it("uses the label as aria-label when present", () => {
    render(<AppScreenshotGallery screenshots={shots} brokerName="Acme" />);
    expect(screen.getByLabelText("Dashboard")).toBeInTheDocument();
  });

  it("falls back to index-based aria-label when label is null", () => {
    render(<AppScreenshotGallery screenshots={shots} brokerName="Acme" />);
    expect(
      screen.getByLabelText("Acme screenshot 3 of 3"),
    ).toBeInTheDocument();
  });

  it("opens the lightbox on thumbnail click", async () => {
    const user = userEvent.setup();
    render(<AppScreenshotGallery screenshots={shots} brokerName="Acme" />);
    await user.click(screen.getByLabelText("Dashboard"));
    expect(
      screen.getByRole("dialog", { name: /lightbox/i }),
    ).toBeInTheDocument();
  });

  it("closes the lightbox when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<AppScreenshotGallery screenshots={shots} brokerName="Acme" />);
    await user.click(screen.getByLabelText("Dashboard"));
    await user.click(screen.getByLabelText("Close screenshot lightbox"));
    expect(
      screen.queryByRole("dialog"),
    ).not.toBeInTheDocument();
  });

  it("shows next/prev buttons when there are multiple screenshots", async () => {
    const user = userEvent.setup();
    render(<AppScreenshotGallery screenshots={shots} brokerName="Acme" />);
    await user.click(screen.getByLabelText("Dashboard"));
    expect(screen.getByLabelText("Previous screenshot")).toBeInTheDocument();
    expect(screen.getByLabelText("Next screenshot")).toBeInTheDocument();
  });

  it("does not show nav buttons for a single screenshot", async () => {
    const user = userEvent.setup();
    render(
      <AppScreenshotGallery
        screenshots={[{ url: "/only.jpg", label: "Only" }]}
        brokerName="Acme"
      />,
    );
    await user.click(screen.getByLabelText("Only"));
    expect(
      screen.queryByLabelText("Previous screenshot"),
    ).not.toBeInTheDocument();
  });
});
