// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Sheet from "@/components/ui/Sheet";

describe("Sheet", () => {
  it("renders a modal dialog with the title when open", () => {
    render(
      <Sheet open onClose={() => {}} title="Three's a shortlist">
        <p>Body content</p>
      </Sheet>,
    );
    const dialog = screen.getByRole("dialog", { name: "Three's a shortlist" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("Body content")).toBeTruthy();
  });

  it("renders nothing when closed", () => {
    render(
      <Sheet open={false} onClose={() => {}} title="Hidden">
        <p>Never seen</p>
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Escapable">
        <button>Focusable</button>
      </Sheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes via the close button", () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} title="Closable">
        <p>Body</p>
      </Sheet>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[1] as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it("locks body scroll while open and restores on close", () => {
    const { unmount } = render(
      <Sheet open onClose={() => {}} title="Scroll lock">
        <p>Body</p>
      </Sheet>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("renders the footer slot", () => {
    render(
      <Sheet open onClose={() => {}} title="With footer" footer={<button>Primary action</button>}>
        <p>Body</p>
      </Sheet>,
    );
    expect(screen.getByRole("button", { name: "Primary action" })).toBeTruthy();
  });
});
