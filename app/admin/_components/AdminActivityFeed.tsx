"use client";

import Link from "next/link";

interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  time: string;
  href: string;
  color: string;
}

interface Props {
  activity: ActivityItem[];
}

export default function AdminActivityFeed({ activity }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
      {activity.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-sm text-slate-500">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {activity.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900 group-hover:text-amber-700 truncate">{item.title}</div>
                <div className="text-xs text-slate-400 truncate">{item.detail}</div>
              </div>
              <div className="text-[0.6rem] text-slate-400 shrink-0 mt-1 whitespace-nowrap">
                {(() => {
                  const diff = Date.now() - new Date(item.time).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 1) return "just now";
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  const days = Math.floor(hrs / 24);
                  return `${days}d ago`;
                })()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
