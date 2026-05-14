import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

// eslint-disable-next-line no-restricted-imports -- Advisor settings surface: pending/active professionals may not be visible to anon-RLS; mirrors pros/billing/page.tsx pattern.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";
import { listForProfessional, MAX_QUESTIONS_PER_OWNER } from "@/lib/pro-intake";

import IntakeQuestionsEditor from "./IntakeQuestionsEditor";

export const metadata: Metadata = {
  title: "Intake questions — Invest.com.au",
  description: "Customise the questions a consumer must answer after accepting their brief.",
  alternates: { canonical: `${SITE_URL}/pros/settings/intake` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProsIntakeSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/pros/settings/intake");
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id, name")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!pro) {
    redirect("/pros/join");
  }

  const advisor = pro as { id: number; name: string };
  const questions = await listForProfessional(advisor.id);

  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-12">
      <div className="container-custom max-w-3xl">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/" className="hover:text-slate-700">
            Home
          </Link>
          <span>/</span>
          <Link href="/pros/billing" className="hover:text-slate-700">
            Pros
          </Link>
          <span>/</span>
          <span className="text-slate-700">Intake questions</span>
        </div>

        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Intake questions
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1.5 leading-relaxed">
            Up to {MAX_QUESTIONS_PER_OWNER} short prompts the consumer must answer
            after accepting your brief, before the contact handoff completes.
          </p>
        </header>

        <IntakeQuestionsEditor
          ownerKind="professional"
          ownerId={advisor.id}
          initial={questions}
          maxQuestions={MAX_QUESTIONS_PER_OWNER}
        />
      </div>
    </div>
  );
}
