import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SocialShareButtons from "@/components/SocialShareButtons";

const URL = "https://invest.com.au/expert/my-article";
const TITLE = "My Article — Expert Insights";

// jsdom has no navigator.share; define/clear it per-test. We assign `undefined`
// to "clear" (the component checks `typeof navigator.share === "function"`),
// which avoids `delete` on a non-optional DOM lib property.
function setShare(fn: ((data: ShareData) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "share", { value: fn, configurable: true, writable: true });
}
function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true, writable: true });
}

describe("SocialShareButtons", () => {
  const origShare = (navigator as Navigator & { share?: unknown }).share;
  const origClipboard = navigator.clipboard;

  afterEach(() => {
    setShare(origShare as ((data: ShareData) => Promise<void>) | undefined);
    setClipboard(origClipboard);
    vi.clearAllMocks();
  });

  it("always renders X/Twitter, LinkedIn, and copy-link controls", () => {
    setShare(undefined);
    render(<SocialShareButtons url={URL} title={TITLE} />);
    expect(screen.getByRole("link", { name: /Share on X/i })).toHaveAttribute(
      "href",
      expect.stringContaining("twitter.com/intent/tweet"),
    );
    expect(screen.getByRole("link", { name: /Share on LinkedIn/i })).toHaveAttribute(
      "href",
      expect.stringContaining("linkedin.com/sharing"),
    );
    expect(screen.getByRole("button", { name: /Copy link/i })).toBeInTheDocument();
  });

  it("does NOT render the native Share button when the Web Share API is unavailable", () => {
    setShare(undefined);
    render(<SocialShareButtons url={URL} title={TITLE} />);
    expect(screen.queryByRole("button", { name: /^Share$/i })).not.toBeInTheDocument();
  });

  it("renders the native Share button and invokes navigator.share when available", async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    setShare(shareSpy);

    render(<SocialShareButtons url={URL} title={TITLE} description="A summary" />);

    const shareBtn = await screen.findByRole("button", { name: /^Share$/i });
    fireEvent.click(shareBtn);
    expect(shareSpy).toHaveBeenCalledWith({ title: TITLE, text: "A summary", url: URL });
  });

  it("copies the link to the clipboard via the fallback button", async () => {
    setShare(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(<SocialShareButtons url={URL} title={TITLE} />);
    fireEvent.click(screen.getByRole("button", { name: /Copy link/i }));

    expect(writeText).toHaveBeenCalledWith(URL);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Link copied/i })).toBeInTheDocument();
    });
  });
});
