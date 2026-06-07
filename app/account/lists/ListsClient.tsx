"use client";

import { useState } from "react";
import Link from "next/link";

export interface ListRow {
  id: number;
  title: string;
  description: string;
  slug: string;
  is_public: boolean;
  item_count: number;
  follower_count: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  initialLists: ListRow[];
}

function ListCard({
  list,
  onDelete,
  onTogglePublic,
}: {
  list: ListRow;
  onDelete: (id: number) => void;
  onTogglePublic: (id: number, isPublic: boolean) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    setToggleError(null);
    try {
      const res = await fetch("/api/account/user-lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: list.id, is_public: !list.is_public }),
      });
      if (res.ok) {
        onTogglePublic(list.id, !list.is_public);
      } else {
        const body = await res.json().catch(() => ({}));
        setToggleError((body as { error?: string }).error ?? "Update failed — please try again.");
      }
    } catch {
      setToggleError("Update failed — please try again.");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    setPendingDelete(false);
    setDeleting(true);
    try {
      const res = await fetch("/api/account/user-lists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: list.id }),
      });
      if (res.ok) onDelete(list.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={list.is_public ? `/lists/${list.slug}` : "#"}
              className={`text-base font-semibold truncate ${list.is_public ? "text-violet-700 hover:underline" : "text-slate-900"}`}
            >
              {list.title}
            </Link>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                list.is_public
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {list.is_public ? "Public" : "Private"}
            </span>
          </div>
          {list.description && (
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{list.description}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {list.item_count} {list.item_count === 1 ? "item" : "items"}
            {list.is_public && ` · ${list.follower_count} ${list.follower_count === 1 ? "follower" : "followers"}`}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <button
            onClick={() => { void handleToggle(); }}
            disabled={toggling}
            aria-busy={toggling}
            className="text-xs text-slate-500 hover:text-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {toggling ? "…" : list.is_public ? "Make private" : "Make public"}
          </button>
          {toggleError && (
            <p role="alert" className="text-xs text-red-600">{toggleError}</p>
          )}
          {pendingDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-600 font-medium">Delete?</span>
              <button
                onClick={() => { void handleDelete(); }}
                disabled={deleting}
                aria-busy={deleting}
                className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50"
              >{deleting ? "…" : "Yes"}</button>
              <button
                onClick={() => setPendingDelete(false)}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 hover:border-slate-300 transition-colors"
              >No</button>
            </div>
          ) : (
            <button
              onClick={() => setPendingDelete(true)}
              disabled={deleting}
              aria-busy={deleting}
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AddForm({ onAdd }: { onAdd: (list: ListRow) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      is_public: fd.get("is_public") === "on",
    };
    try {
      const res = await fetch("/api/account/user-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Could not create list.");
      const j = (await res.json()) as { list: ListRow };
      onAdd(j.list);
      (e.target as HTMLFormElement).reset();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not create list.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="text-base font-semibold text-slate-900 mb-3">Create a list</h2>
      <form className="space-y-3" onSubmit={(e) => { void handleSubmit(e); }}>
        <div>
          <label htmlFor="list-title" className="block text-xs font-medium text-slate-600 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="list-title"
            name="title"
            type="text"
            required
            maxLength={80}
            placeholder="e.g. Best low-cost ETFs for beginners"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div>
          <label htmlFor="list-description" className="block text-xs font-medium text-slate-600 mb-1">Description</label>
          <input
            id="list-description"
            name="description"
            type="text"
            maxLength={500}
            placeholder="Optional — helps others understand what this list is for"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            name="is_public"
            type="checkbox"
            id="is_public"
            className="rounded border-slate-300 text-violet-600"
          />
          <label htmlFor="is_public" className="text-sm text-slate-600">
            Make public (shareable with anyone)
          </label>
        </div>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {busy ? "Creating…" : "Create list"}
        </button>
      </form>
    </section>
  );
}

export default function ListsClient({ initialLists }: Props) {
  const [lists, setLists] = useState<ListRow[]>(initialLists);

  const handleAdd = (list: ListRow) => {
    setLists((prev) => [list, ...prev]);
  };

  const handleDelete = (id: number) => {
    setLists((prev) => prev.filter((l) => l.id !== id));
  };

  const handleTogglePublic = (id: number, isPublic: boolean) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, is_public: isPublic } : l)));
  };

  const publicLists = lists.filter((l) => l.is_public);
  const privateLists = lists.filter((l) => !l.is_public);

  return (
    <div className="space-y-6">
      <AddForm onAdd={handleAdd} />

      {lists.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <p className="text-3xl mb-2" aria-hidden>📋</p>
          <p className="font-medium text-slate-600">No lists yet</p>
          <p className="text-sm mt-1">Create your first list above and start curating.</p>
        </div>
      )}

      {publicLists.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Public lists</h2>
          <div className="space-y-3">
            {publicLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onDelete={handleDelete}
                onTogglePublic={handleTogglePublic}
              />
            ))}
          </div>
        </section>
      )}

      {privateLists.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Private lists</h2>
          <div className="space-y-3">
            {privateLists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                onDelete={handleDelete}
                onTogglePublic={handleTogglePublic}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
