"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import type { Lead } from "../types";
import { KANBAN_STAGES, type KanbanStage, type LeadTask, type Sequence, type Enrolment } from "./types";
import { LeadTaskList } from "./LeadTaskList";

type Props = {
  leads: Lead[];
  tasks: LeadTask[];
  sequences: Sequence[];
  enrolments: Enrolment[];
  /** Move a lead to a new pipeline stage (persists + optimistic update upstream). */
  onMoveStage: (leadId: number, stage: KanbanStage) => void;
  onTasksChange: (updater: (prev: LeadTask[]) => LeadTask[]) => void;
  onEnrol: (leadRef: number, sequenceId: number) => Promise<void>;
  onStopEnrolment: (enrolmentId: number) => Promise<void>;
};

/** Open (not done) tasks for a lead, split into overdue vs upcoming. */
function taskCounts(tasks: LeadTask[], leadRef: number, now: number) {
  let overdue = 0;
  let open = 0;
  for (const t of tasks) {
    if (t.lead_ref !== leadRef || t.done_at) continue;
    open++;
    if (t.due_at && new Date(t.due_at).getTime() < now) overdue++;
  }
  return { open, overdue };
}

export default function LeadKanban({
  leads,
  tasks,
  sequences,
  enrolments,
  onMoveStage,
  onTasksChange,
  onEnrol,
  onStopEnrolment,
}: Props) {
  const [dragLeadId, setDragLeadId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<KanbanStage | null>(null);
  const [expandedLead, setExpandedLead] = useState<number | null>(null);
  // Mount-stable "now" for overdue comparison — avoids an impure Date.now()
  // call during render while staying accurate enough for day-grained due dates.
  const [now] = useState(() => Date.now());

  const byStage = useMemo(() => {
    const map = new Map<KanbanStage, Lead[]>();
    for (const s of KANBAN_STAGES) map.set(s.value, []);
    for (const lead of leads) {
      const stage = (lead.pipeline_stage ?? "new") as KanbanStage;
      const bucket = map.get(stage) ?? map.get("new")!;
      bucket.push(lead);
    }
    return map;
  }, [leads]);

  const activeSequences = sequences.filter((s) => s.status === "active");

  const handleDrop = (stage: KanbanStage) => {
    if (dragLeadId != null) {
      const lead = leads.find((l) => l.id === dragLeadId);
      if (lead && (lead.pipeline_stage ?? "new") !== stage) {
        onMoveStage(dragLeadId, stage);
      }
    }
    setDragLeadId(null);
    setDragOverStage(null);
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max" role="list" aria-label="Lead pipeline board">
        {KANBAN_STAGES.map((stage) => {
          const stageLeads = byStage.get(stage.value) ?? [];
          const isDropTarget = dragOverStage === stage.value;
          return (
            <div
              key={stage.value}
              role="listitem"
              className={`w-64 shrink-0 rounded-xl border ${stage.color} ${isDropTarget ? "ring-2 ring-violet-400" : ""} transition-shadow`}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverStage !== stage.value) setDragOverStage(stage.value);
              }}
              onDragLeave={() => setDragOverStage((s) => (s === stage.value ? null : s))}
              onDrop={() => handleDrop(stage.value)}
            >
              <div className="px-3 py-2 border-b border-black/5 flex items-center justify-between sticky top-0">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{stage.label}</span>
                <span className="text-[0.6rem] font-semibold text-slate-500 bg-white/70 rounded-full px-1.5 py-0.5">
                  {stageLeads.length}
                </span>
              </div>
              <div className="p-2 space-y-2 min-h-12">
                {stageLeads.length === 0 && (
                  <p className="text-[0.65rem] text-slate-400 text-center py-3">No leads</p>
                )}
                {stageLeads.map((lead) => {
                  const { open, overdue } = taskCounts(tasks, lead.id, now);
                  const enrol = enrolments.find((e) => e.lead_ref === lead.id);
                  const seq = enrol ? sequences.find((s) => s.id === enrol.sequence_id) : null;
                  const nextStep = seq && enrol ? seq.steps[enrol.current_step] : null;
                  const expanded = expandedLead === lead.id;
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDragLeadId(lead.id)}
                      onDragEnd={() => { setDragLeadId(null); setDragOverStage(null); }}
                      className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-semibold text-slate-900 truncate">{lead.user_name}</span>
                        <span className="text-slate-300 shrink-0 mt-0.5 text-xs leading-none select-none" aria-hidden="true">⠿</span>
                      </div>
                      <p className="text-[0.65rem] text-slate-500 truncate">{lead.user_email}</p>

                      {/* Badges: open/overdue tasks + next sequence step */}
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        {overdue > 0 && (
                          <span className="text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                            {overdue} overdue
                          </span>
                        )}
                        {open - overdue > 0 && (
                          <span className="text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {open - overdue} task{open - overdue === 1 ? "" : "s"}
                          </span>
                        )}
                        {nextStep && (
                          <span
                            className="text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200"
                            title={`Next: "${nextStep.subject}" on day ${nextStep.day_offset}`}
                          >
                            seq: day {nextStep.day_offset}
                          </span>
                        )}
                        {enrol && !nextStep && (
                          <span className="text-[0.55rem] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            seq done
                          </span>
                        )}
                      </div>

                      {/* Keyboard-accessible stage move (drag alternative) */}
                      <div className="mt-2 flex items-center gap-1">
                        <label className="sr-only" htmlFor={`stage-${lead.id}`}>Move lead to stage</label>
                        <select
                          id={`stage-${lead.id}`}
                          value={(lead.pipeline_stage ?? "new") as KanbanStage}
                          onChange={(e) => onMoveStage(lead.id, e.target.value as KanbanStage)}
                          className="flex-1 text-[0.65rem] border border-slate-200 rounded px-1 py-0.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
                        >
                          {KANBAN_STAGES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setExpandedLead(expanded ? null : lead.id)}
                          aria-expanded={expanded}
                          aria-label={expanded ? "Hide follow-up details" : "Show follow-up details"}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={14} />
                        </button>
                      </div>

                      {expanded && (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                          <LeadTaskList
                            leadRef={lead.id}
                            tasks={tasks.filter((t) => t.lead_ref === lead.id)}
                            onTasksChange={onTasksChange}
                          />
                          <EnrolControl
                            leadRef={lead.id}
                            enrolment={enrol ?? null}
                            sequenceName={seq?.name ?? null}
                            activeSequences={activeSequences}
                            onEnrol={onEnrol}
                            onStop={onStopEnrolment}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Per-card enrol / stop control. */
function EnrolControl({
  leadRef,
  enrolment,
  sequenceName,
  activeSequences,
  onEnrol,
  onStop,
}: {
  leadRef: number;
  enrolment: Enrolment | null;
  sequenceName: string | null;
  activeSequences: Sequence[];
  onEnrol: (leadRef: number, sequenceId: number) => Promise<void>;
  onStop: (enrolmentId: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number | "">("");

  if (enrolment) {
    return (
      <div className="flex items-center justify-between gap-1">
        <span className="text-[0.6rem] text-violet-700 truncate">In: {sequenceName ?? "sequence"}</span>
        <button
          type="button"
          disabled={busy}
          onClick={async () => { setBusy(true); await onStop(enrolment.id); setBusy(false); }}
          className="text-[0.6rem] font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Stop
        </button>
      </div>
    );
  }

  if (activeSequences.length === 0) {
    return <p className="text-[0.6rem] text-slate-400">No active sequences yet.</p>;
  }

  return (
    <div className="flex items-center gap-1">
      <label className="sr-only" htmlFor={`enrol-${leadRef}`}>Enrol lead in sequence</label>
      <select
        id={`enrol-${leadRef}`}
        value={selected}
        onChange={(e) => setSelected(e.target.value ? Number(e.target.value) : "")}
        className="flex-1 text-[0.6rem] border border-slate-200 rounded px-1 py-0.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
      >
        <option value="">Enrol in…</option>
        {activeSequences.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy || selected === ""}
        onClick={async () => {
          if (selected === "") return;
          setBusy(true);
          await onEnrol(leadRef, selected);
          setBusy(false);
          setSelected("");
        }}
        className="text-[0.6rem] font-semibold text-violet-600 hover:text-violet-800 disabled:opacity-40"
      >
        Go
      </button>
    </div>
  );
}
