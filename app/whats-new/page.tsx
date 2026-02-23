"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

interface DataChange {
  id: number;
  broker_slug: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_type: "update" | "add" | "remove";
  changed_at: string;
  source: string;
}

interface GroupedMonth {
  label: string;
  changes: DataChange[];
}

export default function WhatsNewPage() {
  const [groups, setGroups] = useState<GroupedMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data } = await supabase
        .from("broker_data_changes")
        .select("*")
        .gte("changed_at", sixMonthsAgo.toISOString())
        .order("changed_at", { ascending: false });

      const changes = (data || []) as DataChange[];

      // Group by month
      const monthMap = new Map<string, DataChange[]>();
      for (const c of changes) {
        const d = new Date(c.changed_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap.has(key)) monthMap.set(key, []);
        monthMap.get(key)!.push(c);
      }

      const sorted: GroupedMonth[] = [];
      for (const [key, items] of monthMap.entries()) {
        const [y, m] = key.split("-");
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-AU", {
          month: "long",
          year: "numeric",
        });
        sorted.push({ label, changes: items });
      }

      setGroups(sorted);
      setLoading(false);
    };
    load();
  }, []);

  const formatFieldName = (name: string) =>
    name
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const changeBadge = (type: DataChange["change_type"]) => {
    const map: Record<DataChange["change_type"], string> = {
      update: "bg-blue-50 text-blue-700",
      add: "bg-green-50 text-green-700",
      remove: "bg-red-50 text-red-700",
    };
    return (
      <span
        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${map[type]}`}
      >
        {type}
      </span>
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900">
            What Changed
          </h1>
          <p className="text-slate-500 mt-1">
            Tracking broker fee and data changes so you always have accurate
            information.
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="h-6 w-40 bg-slate-100 rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  <div className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-14 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-400">
              No changes recorded yet. When broker fees or data change,
              they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.changes.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-start gap-3"
                    >
                      <div className="mt-0.5">{changeBadge(c.change_type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">
                            {c.broker_slug}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {formatFieldName(c.field_name)}
                          </span>
                        </div>
                        {c.change_type === "update" && (
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <span className="line-through text-red-400 truncate max-w-[180px]">
                              {c.old_value || "—"}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className="text-green-700 font-medium truncate max-w-[180px]">
                              {c.new_value || "—"}
                            </span>
                          </div>
                        )}
                        {c.change_type === "add" && (
                          <p className="text-xs text-green-700 mt-1">
                            {c.new_value}
                          </p>
                        )}
                        {c.change_type === "remove" && (
                          <p className="text-xs text-red-500 line-through mt-1">
                            {c.old_value}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(c.changed_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
