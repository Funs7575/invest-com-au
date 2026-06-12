/**
 * Follow-Up Autopilot shared limits — pure constants, safe for both client and
 * server bundles. Mirror the CHECK constraints in
 * supabase/migrations/20260612220000_lead_tasks_sequences.sql; keep them in sync.
 */
/** Feature flag gating the whole Follow-Up Autopilot (fail-closed when absent). */
export const LEAD_SEQUENCES_FLAG = "lead_sequences";

export const MAX_TASK_TITLE_LEN = 200;
export const MAX_SEQUENCE_NAME_LEN = 120;
export const MAX_STEPS_PER_SEQUENCE = 3;
export const MAX_SUBJECT_LEN = 150;
export const MAX_BODY_LEN = 2000;
export const MAX_DAY_OFFSET = 30;
