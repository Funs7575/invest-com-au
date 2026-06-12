// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BottomSheet from "@/components/BottomSheet";

describe("BottomSheet", () => {
  it("renders a modal dialog with the title when open", () => {
    render(
      <BottomSheet open onClose={() => {}} title="Three's a shortlist">
        <p>Body content</p>
      </BottomSheet>,
    );
    const dialog = screen.getByRole("dialog", { name: "Three's a shortlist" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("Body content")).toBeTruthy();
  });

  it("renders nothing when closed", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} title="Hidden">
        <p>Never seen</p>
      </BottomSheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Escapable">
        <button>Focusable</button>
      </BottomSheet>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll while open and restores on unmount", () => {
    const { unmount } = render(
      <BottomSheet open onClose={() => {}} title="Scroll lock">
        <p>Body</p>
      </BottomSheet>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("renders the footer slot pinned below the body", () => {
    render(
      <BottomSheet open onClose={() => {}} title="With footer" footer={<button>Primary action</button>}>
        <p>Body</p>
      </BottomSheet>,
    );
    expect(screen.getByRole("button", { name: "Primary action" })).toBeTruthy();
  });

  it("restores focus to the opener on close", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open sheet</button>
          <BottomSheet open={open} onClose={() => setOpen(false)} title="Focus restore">
            <p>Body</p>
          </BottomSheet>
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open sheet" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(opener);
  });
});
