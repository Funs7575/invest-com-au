import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limiter';
import { isValidEmail } from '@/lib/validate-email';

const isRateLimited = createRateLimiter(300_000, 5); // 5 leads per 5 min per IP

// Map quiz answer keys to human-readable labels
const EXPERIENCE_MAP: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  pro: 'Advanced',
};

const INVESTMENT_MAP: Record<string, string> = {
  small: 'Under $5,000',
  medium: '$5,000–$50,000',
  large: '$50,000–$100,000',
  whale: '$100,000+',
};

const INTEREST_MAP: Record<string, string> = {
  crypto: 'Crypto',
  trade: 'Active Trading',
  income: 'Dividend Income',
  grow: 'Long-Term Growth',
};

/** Escape HTML special chars to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

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
    console.error('Quiz results email failed (non-blocking):', err);
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
    console.error('Resend contact sync failed (non-blocking):', err);
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, name, answers, top_match_slug } = body as {
    email?: string;
    name?: string;
    answers?: string[];
    top_match_slug?: string;
  };

  if (!isValidEmail(email as string)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const sanitizedEmail = (email as string).trim().toLowerCase().slice(0, 254);
  const sanitizedName = (typeof name === 'string' ? name.trim().slice(0, 100) : null) || null;
  const safeAnswers = Array.isArray(answers) ? answers.slice(0, 10) : [];

  // Parse quiz answers into lead qualification fields
  const experienceLevel = safeAnswers.find(a => EXPERIENCE_MAP[a]) || null;
  const investmentRange = safeAnswers.find(a => INVESTMENT_MAP[a]) || null;
  const tradingInterest = safeAnswers.find(a => INTEREST_MAP[a]) || null;

  // Insert into quiz_leads
  const { error: leadError } = await supabase.from('quiz_leads').insert({
    email: sanitizedEmail,
    name: sanitizedName,
    answers: safeAnswers,
    top_match_slug: typeof top_match_slug === 'string' ? top_match_slug.slice(0, 100) : null,
    experience_level: experienceLevel ? EXPERIENCE_MAP[experienceLevel] : null,
    investment_range: investmentRange ? INVESTMENT_MAP[investmentRange] : null,
    trading_interest: tradingInterest ? INTEREST_MAP[tradingInterest] : null,
  });

  if (leadError) {
    console.error('quiz_leads insert error:', leadError.message);
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
    if (error) console.error('email_captures upsert error:', error.message);
  });

  // Send personalized quiz results email (fire-and-forget)
  const safeTopMatch = typeof top_match_slug === 'string' ? top_match_slug.slice(0, 100) : null;
  if (safeTopMatch) {
    sendQuizResultsEmail(
      sanitizedEmail,
      sanitizedName,
      safeTopMatch,
      experienceLevel ? EXPERIENCE_MAP[experienceLevel] : null,
      investmentRange ? INVESTMENT_MAP[investmentRange] : null,
      tradingInterest ? INTEREST_MAP[tradingInterest] : null,
    ).catch(() => {});
  }

  // Sync to Resend Contacts with quiz-specific properties
  syncToResendContacts(sanitizedEmail, sanitizedName, {
    source: 'quiz',
    signed_up: new Date().toISOString().split('T')[0],
    ...(top_match_slug ? { top_match: top_match_slug } : {}),
    ...(experienceLevel ? { experience: EXPERIENCE_MAP[experienceLevel] } : {}),
    ...(investmentRange ? { investment_range: INVESTMENT_MAP[investmentRange] } : {}),
    ...(tradingInterest ? { trading_interest: INTEREST_MAP[tradingInterest] } : {}),
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
