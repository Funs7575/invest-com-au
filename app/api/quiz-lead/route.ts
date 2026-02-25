import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter (per-IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 300_000; // 5 minutes
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

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
