"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { logger } from "@/lib/logger";
import { MAX_TASK_TITLE_LEN } from "@/lib/advisor-portal/crm-constants";
import type { LeadTask } from "./types";

const log = logger("advisor-portal-tasks");

type Props = {
  leadRef: number;
  tasks: LeadTask[];
  onTasksChange: (updater: (prev: LeadTask[]) => LeadTask[]) => void;
};

/** Add / complete / delete per-lead tasks, with a due date. */
export function LeadTaskList({ leadRef, tasks, onTasksChange }: Props) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mount-stable "now" for overdue styling (day-grained due dates).
  const [now] = useState(() => Date.now());

  const leadTasks = tasks
    .filter((t) => t.lead_ref === leadRef)
    .sort((a, b) => {
      // Open before done; within open, soonest due first.
      if (!!a.done_at !== !!b.done_at) return a.done_at ? 1 : -1;
      const ad = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const bd = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return ad - bd;
    });

  const addTask = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/advisor-portal/lead-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_ref: leadRef,
          title: trimmed,
          due_at: due ? new Date(due + "T09:00:00+10:00").toISOString() : null,
        }),
      });
      if (!res.ok) {
        setError("Couldn't add task.");
        return;
      }
      const { task } = (await res.json()) as { task: LeadTask };
      onTasksChange((prev) => [...prev, task]);
      setTitle("");
      setDue("");
    } catch (err) {
      log.warn("add task failed", { err: String(err) });
      setError("Couldn't add task.");
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = async (task: LeadTask) => {
    const nextDone = !task.done_at;
    // Optimistic
    onTasksChange((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done_at: nextDone ? new Date().toISOString() : null } : t)),
    );
    try {
      await fetch("/api/advisor-portal/lead-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, done: nextDone }),
      });
    } catch (err) {
      log.warn("toggle task failed", { err: String(err) });
    }
  };

  const deleteTask = async (task: LeadTask) => {
    onTasksChange((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await fetch("/api/advisor-portal/lead-tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id }),
      });
    } catch (err) {
      log.warn("delete task failed", { err: String(err) });
    }
  };

  return (
    <div>
      <p className="text-[0.6rem] font-bold uppercase tracking-wide text-slate-500 mb-1">Tasks</p>
      <ul className="space-y-1">
        {leadTasks.length === 0 && <li className="text-[0.6rem] text-slate-400">No tasks.</li>}
        {leadTasks.map((t) => {
          const overdue = !t.done_at && t.due_at && new Date(t.due_at).getTime() < now;
          return (
            <li key={t.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => toggleDone(t)}
                aria-label={t.done_at ? "Mark task not done" : "Mark task done"}
                className={t.done_at ? "text-emerald-600" : "text-slate-300 hover:text-emerald-600"}
              >
                <Icon name="check-circle" size={14} />
              </button>
              <span className={`flex-1 text-[0.65rem] truncate ${t.done_at ? "line-through text-slate-400" : "text-slate-700"}`}>
                {t.title}
              </span>
              {t.due_at && !t.done_at && (
                <span className={`text-[0.55rem] font-semibold ${overdue ? "text-red-600" : "text-slate-400"}`}>
                  {new Date(t.due_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </span>
              )}
              <button
                type="button"
                onClick={() => deleteTask(t)}
                aria-label="Delete task"
                className="text-slate-300 hover:text-red-500"
              >
                <Icon name="trash-2" size={12} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-1 mt-1.5">
        <label className="sr-only" htmlFor={`task-title-${leadRef}`}>New task</label>
        <input
          id={`task-title-${leadRef}`}
          type="text"
          value={title}
          maxLength={MAX_TASK_TITLE_LEN}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addTask(); } }}
          placeholder="Add a task…"
          className="flex-1 min-w-0 text-[0.65rem] px-1.5 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
        <label className="sr-only" htmlFor={`task-due-${leadRef}`}>Task due date</label>
        <input
          id={`task-due-${leadRef}`}
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="text-[0.6rem] px-1 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
        <button
          type="button"
          onClick={() => void addTask()}
          disabled={busy || !title.trim()}
          aria-label="Add task"
          className="text-violet-600 hover:text-violet-800 disabled:opacity-40"
        >
          <Icon name="plus-circle" size={16} />
        </button>
      </div>
      {error && <p role="alert" className="text-[0.6rem] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
