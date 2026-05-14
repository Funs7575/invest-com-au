"use client";

import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * "The Squad" — vertical card list showing each Pro Squad member's
 * role, headshot, and one-line bio with verified badge. Replaces the
 * simpler 2-up grid with a richer stack profile that builds trust by
 * showing the team's coverage of roles (accountant + adviser + broker
 * + buyer's agent etc.).
 *
 * Read-only over existing tables (expert_team_members + professionals).
 * No new schema.
 */

interface Member {
  id: number;
  professional_id: number;
  member_role: string;
  public_title: string | null;
  pro_name: string;
  pro_slug: string;
  pro_type: string;
  pro_photo_url: string | null;
  /** Pulled from professionals.tagline_short — may be null. */
  pro_tagline: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  lead:           "Squad lead",
  accountant:     "Accountant",
  adviser:        "Financial adviser",
  mortgage_broker: "Mortgage broker",
  buyers_agent:   "Buyer's agent",
  tax_agent:      "Tax agent",
  lawyer:         "Lawyer",
  smsf_accountant: "SMSF accountant",
  valuer:         "Valuer",
  member:         "Member",
};

const ROLE_ICONS: Record<string, string> = {
  lead:           "star",
  accountant:     "calculator",
  adviser:        "trending-up",
  mortgage_broker: "landmark",
  buyers_agent:   "search",
  tax_agent:      "file-text",
  lawyer:         "scale",
  smsf_accountant: "calculator",
  valuer:         "trending-up",
  member:         "user",
};

interface Props {
  members: Member[];
}

export default function SquadStack({ members }: Props) {
  if (members.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          The Squad
        </p>
        <span className="text-[11px] text-slate-400">
          {members.length} member{members.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-5">
        Multi-discipline team that coordinates the work so you don&apos;t have to.
      </p>
      <div className="space-y-3">
        {members.map((m) => {
          const role = ROLE_LABELS[m.member_role] ?? m.member_role.replace(/_/g, " ");
          const roleIcon = ROLE_ICONS[m.member_role] ?? "user";
          return (
            <Link
              key={m.id}
              href={`/advisor/${m.pro_slug}`}
              className="group flex items-start gap-4 p-4 border border-slate-100 hover:border-amber-400 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              {/* Headshot or initials */}
              {m.pro_photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={m.pro_photo_url}
                  alt={m.pro_name}
                  className="w-14 h-14 rounded-full object-cover shrink-0 bg-slate-100"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm font-bold uppercase shrink-0">
                  {m.pro_name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {m.pro_name}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                    <Icon name="shield-check" size={9} /> Verified
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-1">
                  <Icon name={roleIcon} size={11} className="inline mr-1 text-slate-400" />
                  {m.public_title ?? role}
                </p>
                {m.pro_tagline && (
                  <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                    {m.pro_tagline}
                  </p>
                )}
              </div>

              <Icon
                name="arrow-right"
                size={14}
                className="text-slate-300 group-hover:text-amber-500 shrink-0 mt-2"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
