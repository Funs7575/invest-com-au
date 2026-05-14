import Link from "next/link";
import Icon from "@/components/Icon";
import type { FeedItem } from "@/lib/account/dashboard-state";

/**
 * Recent activity feed on /account — chronological mix of plan
 * updates + brief events + outcome requests.
 */

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

const KIND_ICON: Record<FeedItem["kind"], string> = {
  plan: "clipboard-list",
  brief_event: "message-circle",
  outcome: "check-circle",
};

export default function AccountActivityFeed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="text-base font-bold text-slate-900 mb-1">Recent activity</h2>
        <p className="text-sm text-slate-500">
          When you build a plan or send a Match Request, you&apos;ll see it here.
        </p>
      </section>
    );
  }
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5">
      <h2 className="text-base font-bold text-slate-900 mb-3">Recent activity</h2>
      <ul className="divide-y divide-slate-100">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              href={it.href}
              className="flex items-start gap-3 py-2.5 -mx-2 px-2 rounded hover:bg-slate-50"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Icon name={KIND_ICON[it.kind]} size={14} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {it.title}
                </p>
                {it.body && (
                  <p className="text-xs text-slate-500 truncate">{it.body}</p>
                )}
              </div>
              <span className="text-xs text-slate-400 shrink-0 pt-1">
                {timeAgo(it.at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
