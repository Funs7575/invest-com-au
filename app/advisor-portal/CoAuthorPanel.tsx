"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

/**
 * Co-author UI for the portal articles section:
 *  - <CoAuthorInvitesBanner/> — invitations addressed to the calling advisor
 *    with accept/decline actions.
 *  - <InviteCoAuthorButton/> — per-article invite affordance for the owner.
 */

interface InviteRow {
  id: number;
  article_id: number;
  status: string;
  created_at: string;
  article_title: string | null;
  inviter_name: string | null;
}

export function CoAuthorInvitesBanner() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/advisor-auth/articles/co-authors")
      .then((r) => (r.ok ? r.json() : { invites: [] }))
      .then((data: { invites?: InviteRow[] }) =>
        setInvites((data.invites ?? []).filter((i) => i.status === "pending")),
      )
      .catch(() => {});
  }, []);

  async function respond(inviteId: number, accept: boolean) {
    setRespondingId(inviteId);
    try {
      const res = await fetch("/api/advisor-auth/articles/co-authors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, accept }),
      });
      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } finally {
      setRespondingId(null);
    }
  }

  if (invites.length === 0) return null;

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-5">
      <h3 className="text-sm font-bold text-violet-900 mb-2 flex items-center gap-1.5">
        <Icon name="users" size={14} /> Co-author invitations
      </h3>
      <ul className="space-y-2">
        {invites.map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 bg-white border border-violet-100 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-700 m-0">
              <strong>{inv.inviter_name ?? "An advisor"}</strong> invited you to co-author{" "}
              <strong>&ldquo;{inv.article_title ?? "an article"}&rdquo;</strong>
            </p>
            <span className="flex gap-1.5">
              <button
                type="button"
                disabled={respondingId === inv.id}
                onClick={() => respond(inv.id, true)}
                className="text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={respondingId === inv.id}
                onClick={() => respond(inv.id, false)}
                className="text-xs font-semibold border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 px-3 py-1.5 rounded-lg"
              >
                Decline
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-violet-600 mt-2 mb-0">
        Accepting adds your byline and profile link to the published article.
      </p>
    </div>
  );
}

export function InviteCoAuthorButton({ articleId }: { articleId: number }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendInvite() {
    if (!email.trim() || state === "sending") return;
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/advisor-auth/articles/co-authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, coAuthorEmail: email.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setState("error");
        setMessage(json.error ?? "Couldn't send the invitation.");
        return;
      }
      setState("sent");
      setEmail("");
    } catch {
      setState("error");
      setMessage("Couldn't send the invitation.");
    }
  }

  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[0.65rem] font-semibold text-violet-600 hover:text-violet-800 inline-flex items-center gap-1"
        >
          <Icon name="user-plus" size={11} /> Invite co-author
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="colleague@firm.com.au"
            aria-label="Co-author email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs w-52"
          />
          <button
            type="button"
            onClick={sendInvite}
            disabled={state === "sending" || !email.trim()}
            className="text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg"
          >
            {state === "sending" ? "Sending…" : "Send"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setState("idle");
            }}
            className="text-xs text-slate-500 hover:text-slate-600"
          >
            Cancel
          </button>
          {state === "sent" && <span className="text-[0.65rem] font-semibold text-emerald-700">Invitation sent ✓</span>}
          {state === "error" && <span className="text-[0.65rem] text-red-600">{message}</span>}
        </div>
      )}
    </div>
  );
}
