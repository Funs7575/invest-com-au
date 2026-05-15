import { getCurrentImpersonation } from "@/lib/admin-impersonation";

/**
 * Sticky top banner shown while an admin is impersonating a user.
 * Server-rendered — mounts in the app root layout but only renders when
 * the iv_impersonate cookie is set AND points to an un-ended audit row.
 */
export default async function ImpersonationBanner() {
  const session = await getCurrentImpersonation();
  if (!session) return null;
  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-slate-900 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow">
      <span>
        Admin impersonating{" "}
        <strong className="font-extrabold">{session.targetEmail}</strong>
      </span>
      <form action="/api/admin/impersonate/end" method="post">
        <button
          type="submit"
          className="text-[11px] bg-slate-900 text-amber-300 px-3 py-1 rounded font-bold hover:bg-slate-800"
        >
          End impersonation
        </button>
      </form>
    </div>
  );
}
