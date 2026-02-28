"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Hook that warns users before navigating away with unsaved changes.
 * Pass `dirty` as `true` when form has unsaved changes.
 */
export function useUnsavedChanges(dirty: boolean) {
  const dirtyRef = useRef(dirty);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Warn on browser close / refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      // Modern browsers ignore custom messages, but returnValue is required
      e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Track dirty state for Next.js navigation
  const confirmNavigation = useCallback(
    (callback: () => void) => {
      if (!dirtyRef.current) {
        callback();
        return;
      }
      if (confirm("You have unsaved changes. Discard and continue?")) {
        callback();
      }
    },
    []
  );

  return { confirmNavigation };
}
