"use client";

import { useEffect, useRef } from "react";

/**
 * Keyboard / focus accessibility for modal dialogs.
 *
 * Ports the Escape-to-close + focus-trap + initial-focus + focus-restoration
 * pattern that already lives in `components/BottomSheet.tsx` and
 * `components/ConfirmDialog.tsx` into a single reusable hook so dialogs don't
 * each re-implement it (WCAG 2.1.1 keyboard, 2.4.3 focus order).
 *
 * Usage:
 *   const dialogRef = useRef<HTMLDivElement>(null);
 *   useDialogA11y({ open, onClose, containerRef: dialogRef });
 *   return open ? <div ref={dialogRef} role="dialog" aria-modal="true">…</div> : null;
 *
 * While `open`:
 *   - Escape calls `onClose`.
 *   - Tab / Shift+Tab cycle within the container (focus trap).
 *   - The first focusable element (or `initialFocusRef`, if given) is focused.
 *   - On close, focus returns to whatever was focused before the dialog opened.
 */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseDialogA11yOptions {
  /** Whether the dialog is currently rendered/visible. */
  open: boolean;
  /** Called when the user presses Escape. */
  onClose: () => void;
  /** Ref to the dialog container that owns the focusable elements. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Optional element to focus first instead of the first focusable child. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export function useDialogA11y({
  open,
  onClose,
  containerRef,
  initialFocusRef,
}: UseDialogA11yOptions): void {
  // Keep latest onClose without re-subscribing the listener (or re-running the
  // focus capture/restore) every time the parent passes a new callback identity.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    // Remember what had focus so we can restore it when the dialog closes.
    const previouslyFocused =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      // Focus trap: cycle Tab within the container.
      if (e.key === "Tab" && containerRef.current) {
        const focusable = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);

    // Move focus into the dialog after it paints.
    const focusTimer = setTimeout(() => {
      const target =
        initialFocusRef?.current ??
        containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
        containerRef.current;
      target?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKey);
      clearTimeout(focusTimer);
      // Restore focus to the trigger (only if it's still in the document).
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [open, containerRef, initialFocusRef]);
}
