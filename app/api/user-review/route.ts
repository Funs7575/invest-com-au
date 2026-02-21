import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter (per-IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 300_000; // 5 minutes
const RATE_LIMIT_MAX = 3; // max 3 reviews per 5 minutes per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

// Clean up stale entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

// RFC 5322 simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

function sanitize(str: unknown, maxLen: number): string {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

function buildVerificationEmail(displayName: string, brokerName: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Review</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px 16px;">
    <div style="background: linear-gradient(135deg, #15803d 0%, #166534 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 800;">Verify Your Review</h1>
    </div>
    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${displayName},
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
        Thanks for reviewing <strong>${brokerName}</strong> on Invest.com.au. Click the button below to verify your email and submit your review for approval.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background-color: #15803d; color: #ffffff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">
          Verify My Review
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 16px 0 0 0; line-height: 1.5;">
        If you didn't write this review, you can safely ignore this email.<br>
        This link expires in 7 days.
      </p>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 16px 0 0 0;">
        <a href="https://invest.com.au" style="color: #94a3b8;">invest.com.au</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { broker_slug, display_name, email, rating, title, body: reviewBody, pros, cons } = body as {
    broker_slug?: string;
    display_name?: string;
    email?: string;
    rating?: number;
    title?: string;
    body?: string;
    pros?: string | null;
    cons?: string | null;
  };

  // Validate required fields
  if (!broker_slug || typeof broker_slug !== 'string') {
    return NextResponse.json({ error: 'Broker is required' }, { status: 400 });
  }
  if (!isValidEmail(email as string)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
  }
  if (!display_name || typeof display_name !== 'string' || display_name.trim().length < 2) {
    return NextResponse.json({ error: 'Display name is required (min 2 characters)' }, { status: 400 });
  }
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return NextResponse.json({ error: 'Review title is required (min 3 characters)' }, { status: 400 });
  }
  if (!reviewBody || typeof reviewBody !== 'string' || reviewBody.trim().length < 10) {
    return NextResponse.json({ error: 'Review body is required (min 10 characters)' }, { status: 400 });
  }

  // Rate limit
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify broker exists
  const { data: broker } = await supabase
    .from('brokers')
    .select('id, name, slug')
    .eq('slug', broker_slug)
    .eq('status', 'active')
    .single();

  if (!broker) {
    return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
  }

  // Check for duplicate (same email + broker within 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const sanitizedEmail = (email as string).trim().toLowerCase().slice(0, 254);

  const { data: existing } = await supabase
    .from('user_reviews')
    .select('id')
    .eq('broker_slug', broker.slug)
    .eq('email', sanitizedEmail)
    .gte('created_at', ninetyDaysAgo)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'You have already reviewed this broker recently.' }, { status: 409 });
  }

  // Generate verification token
  const verificationToken = crypto.randomUUID();

  // Sanitize inputs
  const sanitizedName = sanitize(display_name, 50);
  const sanitizedTitle = sanitize(title, 120);
  const sanitizedBody = sanitize(reviewBody, 2000);
  const sanitizedPros = pros ? sanitize(pros, 500) : null;
  const sanitizedCons = cons ? sanitize(cons, 500) : null;

  // Insert review
  const { error: insertError } = await supabase.from('user_reviews').insert({
    broker_id: broker.id,
    broker_slug: broker.slug,
    display_name: sanitizedName,
    email: sanitizedEmail,
    rating,
    title: sanitizedTitle,
    body: sanitizedBody,
    pros: sanitizedPros,
    cons: sanitizedCons,
    verification_token: verificationToken,
    status: 'pending',
  });

  if (insertError) {
    console.error('user_review insert error:', insertError.message);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }

  // Send verification email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://invest-com-au.vercel.app';
  const verifyUrl = `${siteUrl}/api/user-review/verify?token=${verificationToken}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const html = buildVerificationEmail(sanitizedName, broker.name, verifyUrl);
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Invest.com.au <fees@invest.com.au>',
          to: [sanitizedEmail],
          subject: `Verify your review of ${broker.name} — Invest.com.au`,
          html,
        }),
      });
    } catch (err) {
      console.error('Failed to send verification email:', err);
      // Non-blocking — the review is still saved
    }
  }

  return NextResponse.json({ success: true });
}
