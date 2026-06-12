"use client";

import { useEffect, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";
import { logger } from "@/lib/logger";
import { firstName, type MergeContext } from "@/lib/advisor-portal/sequences";
import type { Advisor, Lead } from "../types";
import type { CrmBundle, LeadTask, Sequence, Enrolment, KanbanStage } from "./types";
import LeadKanban from "./LeadKanban";
import SequenceEditor from "./SequenceEditor";

const log = logger("advisor-portal-followup");

type Props = {
  leads: Lead[];
  advisor: Advisor | null;
  /** Renders the existing LeadsTab list (the byte-identical flag-off view). */
  renderList: () => ReactNode;
  /** Persist a pipeline-stage move (shared with the list's pipeline updater). */
  onMoveStage: (leadId: number, stage: KanbanStage) => void;
};

type View = "list" | "board";

/**
 * Follow-Up Autopilot host. Fetches the CRM bundle on mount; until it confirms
 * the `lead_sequences` flag is on (`enabled: true`), it renders ONLY the
 * existing list — so when the flag is off this component is a transparent
 * pass-through and LeadsTab behaves exactly as before.
 */
export default function FollowUpPanel({ leads, advisor, renderList, onMoveStage }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [view, setView] = useState<View>("board");
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [enrolments, setEnrolments] = useState<Enrolment[]>([]);
  const [editing, setEditing] = useState<{ sequence: Sequence | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/advisor-portal/crm")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d: { enabled: boolean } | CrmBundle) => {
        if (cancelled) return;
        if (!d.enabled) { setEnabled(false); return; }
        const bundle = d as CrmBundle;
        setTasks(bundle.tasks ?? []);
        setSequences(bundle.sequences ?? []);
        setEnrolments(bundle.enrolments ?? []);
        setEnabled(true);
      })
      .catch((err) => {
        // Treat any failure as "feature off" — never break the leads view.
        log.warn("crm bundle load failed", { err: String(err) });
        if (!cancelled) setEnabled(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Flag off (or still resolving / errored) → existing list, untouched.
  if (enabled !== true) return <>{renderList()}</>;

  const previewCtx: MergeContext = {
    leadFirstName: firstName(leads[0]?.user_name) || "Alex",
    adviserName: advisor?.name ?? "Your name",
    adviserFirm: advisor?.firm_name ?? "",
  };

  const enrol = async (leadRef: number, sequenceId: number) => {
    try {
      const res = await fetch("/api/advisor-portal/sequence-enrolments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence_id: sequenceId, lead_ref: leadRef }),
      });
      if (!res.ok) return;
      const { enrolment } = (await res.json()) as { enrolment: Enrolment };
      setEnrolments((prev) => [...prev.filter((e) => e.lead_ref !== leadRef || e.sequence_id !== sequenceId), enrolment]);
    } catch (err) {
      log.warn("enrol failed", { err: String(err) });
    }
  };

  const stopEnrolment = async (enrolmentId: number) => {
    setEnrolments((prev) => prev.filter((e) => e.id !== enrolmentId));
    try {
      await fetch("/api/advisor-portal/sequence-enrolments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrolment_id: enrolmentId }),
      });
    } catch (err) {
      log.warn("stop enrolment failed", { err: String(err) });
    }
  };

  return (
    <div>
      {/* View toggle + sequences manager */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
          <button
            onClick={() => setView("board")}
            className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${view === "board" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            aria-pressed={view === "board"}
          >
            <Icon name="layout-dashboard" size={13} /> Board
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${view === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            aria-pressed={view === "list"}
          >
            <Icon name="clipboard-list" size={13} /> List
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {sequences.map((s) => (
            <button
              key={s.id}
              onClick={() => setEditing({ sequence: s })}
              className={`flex items-center gap-1 text-[0.7rem] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                s.status === "active"
                  ? "border-violet-200 text-violet-700 hover:bg-violet-50"
                  : "border-slate-200 text-slate-400 hover:bg-slate-50"
              }`}
              title={`${s.steps.length} step${s.steps.length === 1 ? "" : "s"} · ${s.status}`}
            >
              <Icon name="edit-3" size={11} /> {s.name}
              {s.status === "paused" && <span className="text-[0.55rem]">(paused)</span>}
            </button>
          ))}
          <button
            onClick={() => setEditing({ sequence: null })}
            className="flex items-center gap-1 text-[0.7rem] font-semibold px-2 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
          >
            <Icon name="plus-circle" size={12} /> New sequence
          </button>
        </div>
      </div>

      {view === "board" ? (
        <LeadKanban
          leads={leads}
          tasks={tasks}
          sequences={sequences}
          enrolments={enrolments}
          onMoveStage={onMoveStage}
          onTasksChange={setTasks}
          onEnrol={enrol}
          onStopEnrolment={stopEnrolment}
        />
      ) : (
        renderList()
      )}

      {editing && (
        <SequenceEditor
          sequence={editing.sequence}
          previewCtx={previewCtx}
          onClose={() => setEditing(null)}
          onSaved={(seq) =>
            setSequences((prev) => {
              const exists = prev.some((s) => s.id === seq.id);
              return exists ? prev.map((s) => (s.id === seq.id ? seq : s)) : [seq, ...prev];
            })
          }
          onDeleted={(id) => {
            setSequences((prev) => prev.filter((s) => s.id !== id));
            setEnrolments((prev) => prev.filter((e) => e.sequence_id !== id));
          }}
        />
      )}
    </div>
  );
}
