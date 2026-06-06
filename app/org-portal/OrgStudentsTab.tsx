"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Organisation } from "./types";

interface Student {
  user_id: string;
  user_email: string;
  user_name: string;
  course_title: string;
  course_id: number;
  enrolled_at: string;
  completion_pct: number;
  has_certificate: boolean;
}

type Props = {
  org: Organisation | null;
};

export default function OrgStudentsTab({ org: _org }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org-auth/students");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setStudents(data.students ?? []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = search.trim()
    ? students.filter((s) => {
        const q = search.toLowerCase();
        return s.user_name.toLowerCase().includes(q) || s.user_email.toLowerCase().includes(q);
      })
    : students;

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-48 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">{students.length} enrollment{students.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {students.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="users" size={32} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No students yet</h3>
          <p className="text-xs text-slate-500">Students will appear here once they enroll in your courses.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-500">No students match &ldquo;{search}&rdquo;.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[0.62rem] font-semibold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="px-4 py-2.5">Name / Email</th>
                  <th scope="col" className="px-4 py-2.5">Course</th>
                  <th scope="col" className="px-4 py-2.5">Progress</th>
                  <th scope="col" className="px-4 py-2.5">Certificate</th>
                  <th scope="col" className="px-4 py-2.5">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={`${s.user_id}-${s.course_id}`} className="text-xs hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">{s.user_name}</div>
                      <div className="text-[0.58rem] text-slate-400">{s.user_email}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate">
                      {s.course_title}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-100 rounded-full h-1.5 w-16 inline-block">
                          <div
                            className="bg-teal-500 h-1.5 rounded-full"
                            style={{ width: `${s.completion_pct}%` }}
                          />
                        </div>
                        <span className="text-[0.58rem] text-slate-500">{s.completion_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {s.has_certificate ? (
                        <span className="text-[0.56rem] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Issued
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(s.enrolled_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
