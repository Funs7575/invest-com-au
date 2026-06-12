import type { Metadata } from "next";
import { headers } from "next/headers";

import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { isFlagEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- cross-table workspace lookup: resolves the caller's active account kind label so the brief form can prefill business/listing-owner context. Reads only the user's own profile under service-role because business_accounts / listing_owner_accounts have no anon SELECT path.
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveKind, type WorkspaceKind } from "@/lib/account-kinds";
import { getInvestorProfile } from "@/lib/investor-profiles";
import { parseMoneyMeta } from "@/lib/money-profile";
import {
  HOUSEHOLDS_FLAG,
  getHouseholdContextForUser,
  partnerLabel as householdPartnerLabel,
} from "@/lib/households";
import DirectoryHero from "@/components/directory/DirectoryHero";
import BriefForm from "./BriefForm";

interface WorkspaceContext {
  kind: WorkspaceKind;
  label: string;
  prefillName: string | null;
  prefillEmail: string | null;
  prefillPhone: string | null;
}

async function loadWorkspaceContext(): Promise<WorkspaceContext | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const active = await getActiveKind();
    if (!active) return null;
    const admin = createAdminClient();
    if (active === "business_owner") {
      const { data } = await admin
        .from("business_accounts")
        .select("business_name, contact_name, contact_email, contact_phone")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!data) return null;
      return {
        kind: "business_owner",
        label: (data.business_name as string) || "your business",
        prefillName: (data.contact_name as string) ?? null,
        prefillEmail: (data.contact_email as string) ?? user.email ?? null,
        prefillPhone: (data.contact_phone as string) ?? null,
      };
    }
    if (active === "listing_owner") {
      const { data } = await admin
        .from("listing_owner_accounts")
        .select("owner_name, contact_email, contact_phone")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!data) return null;
      return {
        kind: "listing_owner",
        label: (data.owner_name as string) || "your listing",
        prefillName: (data.owner_name as string) ?? null,
        prefillEmail: (data.contact_email as string) ?? user.email ?? null,
        prefillPhone: (data.contact_phone as string) ?? null,
      };
    }
    if (active === "investor") {
      const { data } = await admin
        .from("investor_profiles")
        .select("full_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      return {
        kind: "investor",
        label: (data?.full_name as string) || (user.email as string) || "you",
        prefillName: (data?.full_name as string) ?? null,
        prefillEmail: user.email ?? null,
        prefillPhone: null,
      };
    }
    return {
      kind: active,
      label: active.replace(/_/g, " "),
      prefillName: null,
      prefillEmail: user.email ?? null,
      prefillPhone: null,
    };
  } catch {
    return null;
  }
}

/**
 * Money Profile fallback prefill for signed-in investors: contact name /
 * email from the account, location state from meta.money. The workspace
 * context (business / listing owner) wins where both exist.
 */
async function loadInvestorPrefill(): Promise<{
  name: string | null;
  email: string | null;
  state: string | null;
} | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const profile = await getInvestorProfile(user.id);
    return {
      name: profile?.displayName ?? null,
      email: user.email ?? null,
      state: parseMoneyMeta(profile?.meta).state,
    };
  } catch {
    return null;
  }
}

async function isProSubscriber(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const admin = createAdminClient();
    const { data } = await admin
      .from("subscriptions")
      .select("status, plan")
      .eq("auth_user_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Honest social proof: count active, publicly-listable verified pros via the
 * anon client so RLS scopes us to exactly the rows a visitor could see in the
 * directory. Returns null on any error — the form then shows qualitative copy
 * rather than a fabricated number.
 */
async function loadProviderSupply(): Promise<number | null> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    if (error) return null;
    return typeof count === "number" ? count : null;
  } catch {
    return null;
  }
}

/**
 * Household block context (idea #6). Non-null only when the `households` flag is
 * on AND the signed-in user is in a household with an accepted partner. Drives
 * the isolated "post as household" checkbox. Fully dormant otherwise.
 */
async function loadHouseholdContext(): Promise<{
  partnerLabel: string;
  ownLabel: string;
} | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const flagOn = await isFlagEnabled(HOUSEHOLDS_FLAG, {
      userKey: user.email ?? null,
      segment: "user",
    });
    if (!flagOn) return null;
    const ctx = await getHouseholdContextForUser(user.id);
    if (!ctx?.partner) return null;

    let partnerName: string | null = null;
    if (ctx.partner.user_id) {
      try {
        const profile = await getInvestorProfile(ctx.partner.user_id);
        partnerName = profile?.displayName ?? null;
      } catch {
        partnerName = null;
      }
    }
    let ownName: string | null = null;
    try {
      const own = await getInvestorProfile(user.id);
      ownName = own?.displayName ?? null;
    } catch {
      ownName = null;
    }
    return {
      partnerLabel: householdPartnerLabel({
        displayName: partnerName,
        email: ctx.partner.invited_email,
      }),
      ownLabel: householdPartnerLabel({ displayName: ownName, email: user.email }),
    };
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Post a Brief — Get Responses from Verified Australian Pros (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Post one brief and verified Australian professionals, firms and expert teams respond. Compare them and choose — your contact details stay private until you do.",
  alternates: { canonical: `${SITE_URL}/briefs/new` },
  robots: { index: true, follow: true },
};

export default async function NewBriefPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  void searchParams;

  const h = await headers();
  const visitorIp =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "anonymous";
  const aiCopilotEnabled = await isFlagEnabled("ai_match_request_copilot", {
    userKey: visitorIp,
  });
  // Response-guarantee copy only renders while enforcement is actually on —
  // advertising a guarantee the sweep isn't enforcing would be a false claim.
  const responseGuaranteeEnabled = await isFlagEnabled("response_guarantee", {
    segment: "advisor",
  });
  // Group Briefs opt-in checkbox only renders when the demand_pools flag is on
  // (fail-closed dormancy — flag off ⇒ no checkbox, brief never joins a pool).
  const poolOptInEnabled = await isFlagEnabled("demand_pools", { segment: "user" });

  const [workspace, investorPrefill, proSubscriber, proSupply, householdContext] =
    await Promise.all([
      loadWorkspaceContext(),
      loadInvestorPrefill(),
      isProSubscriber(),
      loadProviderSupply(),
      loadHouseholdContext(),
    ]);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Briefs", url: `${SITE_URL}/briefs` },
    { name: "New" },
  ]);

  const supplyStat = proSupply != null && proSupply >= 12
    ? { v: `${proSupply}`, l: "verified pros" }
    : { v: "Verified", l: "pros only" };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <DirectoryHero
        tone="light"
        breadcrumbLabel="Briefs"
        headlineLead="Post a brief, get responses."
        headlineAccent="Choose your pro."
        subtitle={
          <>
            Tell verified Australian pros, firms and expert teams what you need. They
            respond to you — compare and choose. Your details stay private until you do.
          </>
        }
        stats={[
          supplyStat,
          { v: "Private", l: "until you choose" },
          { v: "Multiple", l: "responses" },
          { v: "Free", l: "to post" },
        ]}
      />

      <div className="container-custom max-w-6xl pb-12 pt-4 md:pt-5">
        {responseGuaranteeEnabled && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p className="text-xs leading-relaxed text-emerald-900">
              <span className="font-semibold">24-hour response guarantee.</span>{" "}
              If a provider accepts your brief and doesn&apos;t respond within 24
              hours, we automatically release it to other providers and let you
              know — you never get stuck waiting on a silent accept.
            </p>
          </div>
        )}
        <BriefForm
          aiCopilotEnabled={aiCopilotEnabled}
          workspace={workspace}
          investorPrefill={investorPrefill}
          proSubscriber={proSubscriber}
          proSupply={proSupply}
          poolOptInEnabled={poolOptInEnabled}
          householdContext={householdContext}
        />
      </div>
    </>
  );
}
