/**
 * Pure form funnel rollup logic.
 *
 * Groups form_events rows by (form_name, step) and computes the
 * retention curve: how many distinct sessions made it to each
 * step. Kept pure so the admin dashboard and the unit tests both
 * exercise the same code.
 */

export interface FormEventRow {
  session_id: string;
  form_name: string;
  step: string;
  step_index: number | null;
  event: string;
  created_at: string;
}

export interface FunnelStep {
  step: string;
  stepIndex: number;
  sessionsReached: number;
  conversionFromStart: number; // 0-1
  dropFromPrevious: number; // 0-1 — what % of the previous step bailed
}

export interface FormFunnel {
  form: string;
  totalSessions: number;
  steps: FunnelStep[];
}

/**
 * Compute per-form retention.
 *
 * Rules:
 *   - Only 'view' events count as "reached this step"
 *   - A session counts at most once per step even if it sent
 *     multiple view events
 *   - Steps are ordered by stepIndex ascending (falls back to
 *     first-seen order if stepIndex is null)
 */
export function computeFunnel(rows: FormEventRow[], formName: string): FormFunnel {
  const formRows = rows.filter(
    (r) => r.form_name === formName && r.event === "view",
  );

  // session → Set<step>
  const bySession = new Map<string, Set<string>>();
  for (const r of formRows) {
    if (!bySession.has(r.session_id)) bySession.set(r.session_id, new Set());
    bySession.get(r.session_id)!.add(r.step);
  }

  // Collect distinct steps + their ordinal
  const stepOrder = new Map<string, number>();
  for (const r of formRows) {
    if (!stepOrder.has(r.step)) {
      stepOrder.set(
        r.step,
        r.step_index ?? stepOrder.size,
      );
    }
  }
  const orderedSteps = [...stepOrder.entries()].sort((a, b) => a[1] - b[1]);

  // Count sessions that reached each step
  const reached = new Map<string, number>();
  for (const [sessionId, steps] of bySession) {
    for (const step of steps) reached.set(step, (reached.get(step) || 0) + 1);
    void sessionId;
  }

  const totalSessions = bySession.size;
  const result: FunnelStep[] = [];
  let previousReached = totalSessions;
  for (const [step, idx] of orderedSteps) {
    const sessionsReached = reached.get(step) || 0;
    const conversionFromStart = totalSessions > 0 ? sessionsReached / totalSessions : 0;
    const dropFromPrevious =
      previousReached > 0 ? 1 - sessionsReached / previousReached : 0;
    result.push({
      step,
      stepIndex: idx,
      sessionsReached,
      conversionFromStart,
      dropFromPrevious: Math.max(0, dropFromPrevious),
    });
    previousReached = sessionsReached;
  }

  return {
    form: formName,
    totalSessions,
    steps: result,
  };
}

/**
 * Identify the biggest drop-off step for a given funnel.
 * Returns null if there are no steps.
 */
export function biggestDropStep(funnel: FormFunnel): FunnelStep | null {
  if (funnel.steps.length === 0) return null;
  return funnel.steps.reduce((worst, s) =>
    s.dropFromPrevious > worst.dropFromPrevious ? s : worst,
  );
}
