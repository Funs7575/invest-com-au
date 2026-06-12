/** Shared client types for the Follow-Up Autopilot (lead_sequences flag on). */

export type LeadTask = {
  id: number;
  lead_ref: number;
  title: string;
  due_at: string | null;
  done_at: string | null;
  created_at: string;
};

export type SequenceStep = {
  id?: number;
  day_offset: number;
  subject: string;
  body: string;
  position: number;
};

export type Sequence = {
  id: number;
  name: string;
  status: "active" | "paused";
  created_at: string;
  steps: SequenceStep[];
};

export type Enrolment = {
  id: number;
  sequence_id: number;
  lead_ref: number;
  current_step: number;
  enrolled_at: string;
  completed_at: string | null;
  stopped_at: string | null;
  last_sent_at: string | null;
};

/** The bundle returned by GET /api/advisor-portal/crm when the flag is on. */
export type CrmBundle = {
  enabled: true;
  tasks: LeadTask[];
  sequences: Sequence[];
  enrolments: Enrolment[];
};

/** The 6 pipeline stages, shared with LeadsTab's existing PIPELINE_STAGES. */
export const KANBAN_STAGES = [
  { value: "new", label: "New", color: "bg-amber-50 border-amber-200" },
  { value: "contacted", label: "Contacted", color: "bg-blue-50 border-blue-200" },
  { value: "proposal_sent", label: "Proposal", color: "bg-violet-50 border-violet-200" },
  { value: "negotiating", label: "Negotiating", color: "bg-orange-50 border-orange-200" },
  { value: "won", label: "Won", color: "bg-emerald-50 border-emerald-200" },
  { value: "lost", label: "Lost", color: "bg-red-50 border-red-200" },
] as const;

export type KanbanStage = (typeof KANBAN_STAGES)[number]["value"];
