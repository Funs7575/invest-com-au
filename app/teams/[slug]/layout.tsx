/**
 * Layout for /teams/[slug]/* — adds a shared sub-nav across the members-only
 * Pro Squad surfaces (inbox / dashboard / availability / ops / intake /
 * referrals) so members can move between them (P2-3).
 *
 * Deliberately thin: it does NOT add auth gating or metadata. Each child page
 * (including the public, indexed /teams/[slug] profile) keeps its own
 * auth/membership checks and its own metadata. SquadSubNav renders nothing on
 * the public profile and other non-member routes, so this layout is purely
 * additive and safe to wrap the whole subtree.
 */
import SquadSubNav from "./_components/SquadSubNav";

export default function TeamSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SquadSubNav />
      {children}
    </>
  );
}
