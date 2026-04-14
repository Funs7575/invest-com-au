/**
 * Form funnel instrumentation.
 *
 * Every multi-step form on the site sends one event per step to
 * /api/form-event. Admins see the drop-off curve at
 * /admin/marketplace/funnel.
 *
 * Event shape:
 *   session_id: stable client UUID (same one attribution-touches uses)
 *   form_name:  'quiz' | 'advisor_enquiry' | 'advisor_signup' | 'lead_form' | 'broker_apply'
 *   step:       'start' | 'q1' | ... | 'submit' | 'complete'
 *   event:      'view' | 'interact' | 'complete' | 'abandon'
 *
 * Usage on the client:
 *
 *     import { recordFormEvent } from "@/lib/form-tracking";
 *     recordFormEvent({ form: "quiz", step: "q1", event: "view" });
 *
 * Fire-and-forget by design — a dropped event is strictly better
 * than a broken page. Uses navigator.sendBeacon when available so
 * the final "abandon" event survives tab close.
 */

export type FormName =
  | "quiz"
  | "advisor_enquiry"
  | "advisor_signup"
  | "advisor_apply"
  | "broker_apply"
  | "lead_form";

export type FormEventType = "view" | "interact" | "complete" | "abandon";

export interface FormEventInput {
  form: FormName;
  step: string;
  stepIndex?: number;
  event: FormEventType;
  meta?: Record<string, unknown>;
}

const SESSION_KEY = "invest_session_id";

/**
 * Stable per-browser session id. Reused across every form + the
 * attribution beacon so joins work.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // Private-mode Safari, cookies blocked, etc.
    return `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

export function recordFormEvent(input: FormEventInput): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({
    session_id: getOrCreateSessionId(),
    form_name: input.form,
    step: input.step,
    step_index: input.stepIndex,
    event: input.event,
    meta: input.meta || null,
  });
  const url = "/api/form-event";

  // Prefer sendBeacon so 'abandon' events fire on tab close
  if ("sendBeacon" in navigator) {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    } catch {
      // fall through
    }
  }

  // Fallback: background fetch without awaiting
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Wrap an existing form with auto-tracking for view/complete/abandon.
 * React hook so the page component can drop it in without wiring
 * sendBeacon by hand.
 */
export function useFormFunnelTracking(form: FormName): {
  onStepView: (step: string, stepIndex?: number) => void;
  onInteract: (step: string, stepIndex?: number) => void;
  onComplete: (step?: string) => void;
  onAbandon: (step?: string) => void;
} {
  return {
    onStepView: (step, stepIndex) =>
      recordFormEvent({ form, step, stepIndex, event: "view" }),
    onInteract: (step, stepIndex) =>
      recordFormEvent({ form, step, stepIndex, event: "interact" }),
    onComplete: (step = "complete") =>
      recordFormEvent({ form, step, event: "complete" }),
    onAbandon: (step = "abandon") =>
      recordFormEvent({ form, step, event: "abandon" }),
  };
}
