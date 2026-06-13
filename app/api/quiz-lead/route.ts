import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAllowed, ipKey } from '@/lib/rate-limit-db';
import { isValidEmail, isDisposableEmail } from '@/lib/validate-email';
import { logger } from '@/lib/logger';
import { recordQuizSubmission } from '@/lib/quiz-history';
import { awardIfEligible } from '@/lib/quests-server';
import { setQuizSessionCookie } from '@/lib/quiz-profile';
import { syncQuizToInvestorProfile } from '@/lib/investor-profiles';
import { createClient } from '@/lib/supabase/server';
import { escapeHtml } from "@/lib/html-escape";
import { UnifiedAnswersSchema } from "@/lib/quiz-answer-schemas";
import type { UnifiedAnswers } from "@/lib/quiz-answer-schemas";

/**
 * Body schema. The legacy `answers` (string[]) is preserved for
 * back-compat; new submissions also send `unifiedAnswers` (the structured
 * object from app/quiz/page.tsx) so we can persist queryable columns —
 * goal, mode, experience, amount, priority, complexity, advisor_type,
 * property_sub, location, investor_country, visa_status — for downstream
 * surfaces (drip cron variants, /best pre-filter, /compare prefill).
 *
 * Per-field enum validation lives in lib/quiz-answer-schemas.ts (QQ-01).
 * Unknown values degrade to undefined via .catch() — preserves backward
 * compatibility with older app versions in flight.
 */
const QuizLeadSchema = z.object({
  email: z.string().optional(),
  name: z.string().optional(),
  answers: z.array(z.string()).optional().catch(undefined),
  unifiedAnswers: UnifiedAnswersSchema,
  top_match_slug: z.string().optional(),
  session_id: z.string().optional(),
});

const log = logger('quiz-lead');

// Map quiz answer keys to human-readable labels
const EXPERIENCE_MAP: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  pro: 'Advanced',
};

// Mirrors the `amount` option labels in app/quiz/page.tsx so the band we
// store/email matches what the user actually saw. These had drifted — the
// user picked "$100k–$500k" but the lead recorded "$50k–$100k".
const INVESTMENT_MAP: Record<string, string> = {
  small: 'Under $10,000',
  medium: '$10,000–$100,000',
  large: '$100,000–$500,000',
  whale: '$500,000+',
};

const INTEREST_MAP: Record<string, string> = {
  crypto: 'Crypto',
  trade: 'Active Trading',
  income: 'Dividend Income',
  grow: 'Long-Term Growth',
};

/**
 * Infer the vertical for downstream cohort routing (drip-template
 * selection, /best landing personalisation). Reads the structured answers
 * and returns one of: super, property, crypto, cfd, robo, advisor,
 * international, home, shares (default).
 *
 * Order matters — "international" wins over goal-specific verticals
 * because international users go through the advisor track regardless of
 * their goal. Then advisor (mode=help) wins over DIY goal verticals
 * because advisor users get advisor-flavoured drips.
 */
function inferVertical(a: UnifiedAnswers | undefined): string | null {
  if (!a) return null;
  const intl = a.location === 'international' || a.location === 'expat';
  if (intl) return 'international';
  if (a.mode === 'help' || a.goal === 'help') return 'advisor';
  if (a.goal === 'home') return 'home';
  if (a.goal === 'super' || a.property_sub === 'property-super') return 'super';
  if (a.goal === 'property') return 'property';
  if (a.goal === 'crypto') return 'crypto';
  if (a.goal === 'trade') return 'cfd';
  if (a.goal === 'automate') return 'robo';
  if (a.goal === 'grow' || a.goal === 'income') return 'shares';
  return null;
}

/** Escape HTML special chars to prevent XSS in email templates */
/** Send personalized quiz results email */
async function sendQuizResultsEmail(
  email: string,
  firstName: string | null,
  topMatchSlug: string,
  experience: string | null,
  investmentRange: string | null,
  tradingInterest: string | null,
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  const supabase = createAdminClient();

  // Fetch top match broker details
  const { data: broker } = await supabase
    .from('brokers')
    .select('name, slug, tagline, rating, asx_fee, us_fee, chess_sponsored, color, affiliate_url')
    .eq('slug', topMatchSlug)
    .eq('status', 'active')
    .maybeSingle();

  if (!broker) return;

  // Fetch runner-ups (next 2 brokers by rating, excluding top match)
  const { data: runnerUps } = await supabase
    .from('brokers')
    .select('name, slug, rating, asx_fee, tagline')
    .eq('status', 'active')
    .neq('slug', topMatchSlug)
    .order('rating', { ascending: false })
    .limit(2);

  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi there,';
  const brokerColor = broker.color || '#0f172a';
  const ratingDisplay = broker.rating ? `${broker.rating}/5` : '';

  // Build profile summary from quiz answers
  const profileParts: string[] = [];
  if (experience) profileParts.push(`<strong>Experience:</strong> ${experience}`);
  if (investmentRange) profileParts.push(`<strong>Budget:</strong> ${investmentRange}`);
  if (tradingInterest) profileParts.push(`<strong>Interest:</strong> ${tradingInterest}`);

  const profileSection = profileParts.length > 0 ? `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 0 0 20px;">
      <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Your Profile</p>
      <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.8;">${profileParts.join('<br>')}</p>
    </div>` : '';

  const runnerUpRows = (runnerUps || []).map((r) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 13px;">${r.name}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155; font-size: 13px;">${r.rating ? `${r.rating}/5` : '–'}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155; font-size: 13px;">${r.asx_fee || 'N/A'}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">
        <a href="https://invest.com.au/broker/${r.slug}" style="color: #15803d; font-size: 13px; font-weight: 600; text-decoration: none;">View →</a>
      </td>
    </tr>`).join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 24px 16px;">
      <div style="background: ${brokerColor}; padding: 20px 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <span style="color: #fff; font-weight: 800; font-size: 16px;">🏆 Your Quiz Results</span>
      </div>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">${greeting}</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
          Based on your quiz answers, we've matched you with the broker that best fits your investing style.
        </p>

        ${profileSection}

        <!-- Top match card -->
        <div style="border: 2px solid ${brokerColor}; border-radius: 10px; padding: 20px; margin: 0 0 20px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: ${brokerColor}; text-transform: uppercase; letter-spacing: 1px;">🥇 Your #1 Match</p>
          <h2 style="margin: 0 0 6px; font-size: 22px; color: #0f172a;">${broker.name}</h2>
          ${ratingDisplay ? `<p style="margin: 0 0 8px; font-size: 14px; color: #15803d; font-weight: 700;">⭐ ${ratingDisplay}</p>` : ''}
          ${broker.tagline ? `<p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">${escapeHtml(broker.tagline)}</p>` : ''}
          <div style="display: flex; justify-content: center; gap: 24px; margin: 12px 0;">
            <div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase;">ASX Fee</p>
              <p style="margin: 2px 0 0; font-size: 15px; font-weight: 700; color: #0f172a;">${broker.asx_fee || 'N/A'}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase;">US Fee</p>
              <p style="margin: 2px 0 0; font-size: 15px; font-weight: 700; color: #0f172a;">${broker.us_fee || 'N/A'}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; text-transform: uppercase;">CHESS</p>
              <p style="margin: 2px 0 0; font-size: 15px; font-weight: 700; color: #0f172a;">${broker.chess_sponsored ? '✅' : '❌'}</p>
            </div>
          </div>
          <a href="https://invest.com.au/broker/${broker.slug}" style="display: inline-block; margin-top: 12px; padding: 12px 28px; background: ${brokerColor}; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Read Full Review →</a>
        </div>

        ${(runnerUps && runnerUps.length > 0) ? `
        <!-- Runner-ups -->
        <p style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #0f172a;">Also worth considering:</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 0 0 20px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Broker</th>
              <th style="padding: 8px 12px; text-align: center; font-size: 11px; color: #64748b; text-transform: uppercase;">Rating</th>
              <th style="padding: 8px 12px; text-align: center; font-size: 11px; color: #64748b; text-transform: uppercase;">ASX Fee</th>
              <th style="padding: 8px 12px; text-align: center; font-size: 11px; color: #64748b; text-transform: uppercase;"></th>
            </tr>
          </thead>
          <tbody>${runnerUpRows}</tbody>
        </table>` : ''}

        <div style="text-align: center;">
          <a href="https://invest.com.au/compare" style="color: #15803d; font-size: 13px; font-weight: 600; text-decoration: none;">Compare all brokers side-by-side →</a>
        </div>

        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 24px 0 0 0; line-height: 1.5;">
          Invest.com.au is an independent comparison site. We may earn commissions from partner links.<br>
          <a href="https://invest.com.au/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
        </p>
      </div>
    </div>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Invest.com.au <fees@invest.com.au>',
        to: [email],
        subject: `🏆 Your Top Broker Match: ${broker.name}`,
        html,
      }),
    });
  } catch (err) {
    log.error('Quiz results email failed (non-blocking)', { error: err instanceof Error ? err.message : String(err) });
  }
}

/** Sync contact to Resend Contacts (fire-and-forget) */
async function syncToResendContacts(
  email: string,
  firstName: string | null,
  properties: Record<string, string>,
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  try {
    await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        ...(firstName ? { first_name: firstName } : {}),
        unsubscribed: false,
        properties,
      }),
    });
  } catch (err) {
    log.error('Resend contact sync failed (non-blocking)', { error: err instanceof Error ? err.message : String(err) });
  }
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = QuizLeadSchema.safeParse(raw);
  if (!parsed.success) {
    // Schema only fails on hard type mismatches (e.g. `email: 123`). Match
    // the existing 400 envelope so client error rendering is unchanged.
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  const { email, name, answers, unifiedAnswers, top_match_slug, session_id } = parsed.data;
  // Validate email
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: 'Please use a real email address.' }, { status: 400 });
  }

  // DB-backed limiter: 5 leads / 5 min burst, steady 1 per minute thereafter
  if (!(await isAllowed('quiz_lead', ipKey(request), { max: 5, refillPerSec: 1 / 60 }))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = createAdminClient();

  const sanitizedEmail = email.trim().toLowerCase().slice(0, 254);
  const sanitizedName = (name ? name.trim().slice(0, 100) : null) || null;
  const safeAnswers = answers ? answers.slice(0, 10) : [];

  // Parse quiz answers into lead qualification fields
  const experienceLevel = safeAnswers.find(a => EXPERIENCE_MAP[a]) || null;
  const investmentRange = safeAnswers.find(a => INVESTMENT_MAP[a]) || null;
  const tradingInterest = safeAnswers.find(a => INTEREST_MAP[a]) || null;

  // Compute the inferred vertical from the structured answers — falls back
  // to tradingInterest only when unifiedAnswers wasn't sent (legacy clients).
  const inferredVertical = inferVertical(unifiedAnswers) ?? (tradingInterest ?? null);

  // Insert into quiz_leads. New structured columns (goal, mode,
  // experience, amount, priority, complexity, advisor_type, property_sub,
  // location, investor_country, visa_status, investor_goal_intl) mirror
  // UnifiedAnswers from app/quiz/page.tsx and were added in
  // 20260502152846_quiz_leads_structured_answers. Legacy experience_level
  // / investment_range / trading_interest stay for back-compat with admin
  // pages that already read them.
  const { error: leadError } = await supabase.from('quiz_leads').insert({
    email: sanitizedEmail,
    name: sanitizedName,
    answers: safeAnswers,
    top_match_slug: top_match_slug ? top_match_slug.slice(0, 100) : null,
    experience_level: experienceLevel ? EXPERIENCE_MAP[experienceLevel] : null,
    investment_range: investmentRange ? INVESTMENT_MAP[investmentRange] : null,
    trading_interest: tradingInterest ? INTEREST_MAP[tradingInterest] : null,
    inferred_vertical: inferredVertical,
    goal: unifiedAnswers?.goal ?? null,
    mode: unifiedAnswers?.mode ?? null,
    experience: unifiedAnswers?.experience ?? null,
    amount: unifiedAnswers?.amount ?? null,
    priority: unifiedAnswers?.priority ?? null,
    complexity: unifiedAnswers?.complexity ?? null,
    advisor_type: unifiedAnswers?.advisor_type ?? null,
    property_sub: unifiedAnswers?.property_sub ?? null,
    location: unifiedAnswers?.location ?? null,
    investor_country: unifiedAnswers?.investor_country ?? null,
    visa_status: unifiedAnswers?.visa_status ?? null,
    investor_goal_intl: unifiedAnswers?.investor_goal_intl ?? null,
  });

  if (leadError) {
    log.error('quiz_leads insert error', { error: leadError.message });
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }

  // Upsert into email_captures for unified subscriber list
  // Uses upsert so returning users get re-added even if they previously unsubscribed
  await supabase.from('email_captures').upsert({
    email: sanitizedEmail,
    source: 'quiz',
    newsletter_opt_in: true,
    unsubscribed: false,
    ...(sanitizedName ? { name: sanitizedName } : {}),
  }, { onConflict: 'email' }).then(({ error }) => {
    if (error) log.error('email_captures upsert error', { error: error.message });
  });

  // Send personalized quiz results email (fire-and-forget)
  const safeTopMatch = top_match_slug ? top_match_slug.slice(0, 100) : null;
  if (safeTopMatch) {
    sendQuizResultsEmail(
      sanitizedEmail,
      sanitizedName,
      safeTopMatch,
      experienceLevel ? EXPERIENCE_MAP[experienceLevel] : null,
      investmentRange ? INVESTMENT_MAP[investmentRange] : null,
      tradingInterest ? INTEREST_MAP[tradingInterest] : null,
    ).catch((err) => log.error("[quiz-lead] results email failed:", err));
  }

  // Persist into user_quiz_history so the user (once signed in)
  // can see their quiz history + resume from another device.
  // If there's an authenticated session, stamp with user_id;
  // otherwise stamp only with the anonymous session_id so the
  // row can be claimed on signup via claimSessionQuizzes().
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    const safeSessionId = session_id ? session_id.slice(0, 100) : null;
    if (user?.id || safeSessionId) {
      await recordQuizSubmission({
        userId: user?.id ?? null,
        sessionId: safeSessionId,
        // Persist the STRUCTURED answers (an object) under `structured` — the
        // cross-page profile reader (lib/quiz-profile.ts) keys into
        // structured.investor_country/.amount/.experience. It was previously
        // only given the flat string[] under `raw`, so every profile read
        // returned null. Keep `raw` (the flat array) for legacy consumers.
        answers: { raw: safeAnswers, structured: unifiedAnswers ?? {}, email: sanitizedEmail },
        // Use the same inferred vertical as the quiz_leads row (was
        // `tradingInterest`, which disagreed for the same submission).
        inferredVertical,
        topMatchSlug: safeTopMatch,
        completed: true,
      });
      // Persist the session id so subsequent page renders can fetch
      // this profile and surface a "based on your quiz" recommendations
      // strip without re-prompting (W4.20). Anon-only — once the user
      // is signed in, server-side reads scope by user_id directly.
      if (safeSessionId && !user?.id) {
        await setQuizSessionCookie(safeSessionId);
      }

      // Sync structured signals (life-event flags, intent country, budget,
      // experience) to investor_profiles for the smart-recs ranker. Best-
      // effort; failures don't block the quiz submission. Authed users only —
      // anon users get this sync at claim-on-signup time. (W2 Phase 2.)
      if (user?.id) {
        await syncQuizToInvestorProfile({
          userId: user.id,
          sessionId: safeSessionId,
        });
        // Quest: first-quiz-complete. Authenticated completions only.
        // Fire-and-forget — flag-gated + fail-soft inside; never affects
        // the quiz submission response (already wrapped by the outer
        // non-blocking try/catch).
        void awardIfEligible(user.id, "first-quiz-complete");
      }
    }
  } catch (err) {
    log.warn('quiz-history record failed (non-blocking)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Sync to Resend Contacts with quiz-specific properties
  syncToResendContacts(sanitizedEmail, sanitizedName, {
    source: 'quiz',
    signed_up: new Date().toISOString().split('T')[0],
    ...(top_match_slug ? { top_match: top_match_slug } : {}),
    ...(experienceLevel ? { experience: EXPERIENCE_MAP[experienceLevel] } : {}),
    ...(investmentRange ? { investment_range: INVESTMENT_MAP[investmentRange] } : {}),
    ...(tradingInterest ? { trading_interest: INTEREST_MAP[tradingInterest] } : {}),
  }).catch((err) => log.error("[quiz-lead] resend sync failed:", err));

  return NextResponse.json({ success: true });
}
