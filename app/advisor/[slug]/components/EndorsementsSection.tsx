"use client";

import { useState, useEffect, useCallback } from "react";

type SkillEndorsement = {
  skill: string;
  count: number;
  endorsedByMe: boolean;
};

type Props = {
  slug: string;
  initialSkills?: SkillEndorsement[];
  isLoggedIn: boolean;
};

export default function EndorsementsSection({ slug, initialSkills = [], isLoggedIn }: Props) {
  const [skills, setSkills] = useState<SkillEndorsement[]>(initialSkills);
  const [loading, setLoading] = useState(initialSkills.length === 0);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch(`/api/advisors/${slug}/endorse`);
      if (res.ok) {
        const data = await res.json() as { skills: SkillEndorsement[] };
        setSkills(data.skills);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (initialSkills.length === 0) {
      void fetchSkills();
    } else {
      setLoading(false);
    }
  }, [fetchSkills, initialSkills.length]);

  async function handleToggle(skill: string) {
    if (!isLoggedIn || toggling) return;
    setToggling(skill);
    try {
      const res = await fetch(`/api/advisors/${slug}/endorse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill }),
      });
      if (res.ok) {
        const data = await res.json() as { endorsed: boolean; count: number };
        setSkills((prev) =>
          prev.map((s) =>
            s.skill === skill
              ? { ...s, count: data.count, endorsedByMe: data.endorsed }
              : s
          )
        );
      }
    } finally {
      setToggling(null);
    }
  }

  if (loading) return null;

  if (skills.length === 0 && !isLoggedIn) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-4">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-slate-900">Endorsements</h2>
      </div>
      <div className="p-6">
        {skills.length === 0 ? (
          <p className="text-sm text-slate-500">No endorsements yet. Be the first to endorse a skill.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((s) => (
              <button
                key={s.skill}
                disabled={!isLoggedIn || toggling === s.skill}
                onClick={() => void handleToggle(s.skill)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all
                  ${s.endorsedByMe
                    ? "bg-teal-600 border-teal-600 text-white hover:bg-teal-700"
                    : isLoggedIn
                      ? "bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:text-teal-700 cursor-pointer"
                      : "bg-white border-slate-200 text-slate-700 cursor-default"
                  }
                  ${toggling === s.skill ? "opacity-60" : ""}
                `}
              >
                <span>{s.skill}</span>
                <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 ${s.endorsedByMe ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {!isLoggedIn && (
          <p className="text-xs text-slate-400">
            <a href="/login" className="text-teal-600 hover:underline font-medium">Log in</a> to endorse a skill.
          </p>
        )}
      </div>
    </div>
  );
}
