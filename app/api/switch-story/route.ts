import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter (per-IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 300_000; // 5 minutes
const RATE_LIMIT_MAX = 3;

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

function buildVerificationEmail(displayName: string, sourceName: string, destName: string, verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Switch Story</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px 16px;">
    <div style="background: linear-gradient(135deg, #15803d 0%, #166534 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 800;">Verify Your Switch Story</h1>
    </div>
    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
        Hi ${displayName},
      </p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
        Thanks for sharing your story about switching from <strong>${sourceName}</strong> to <strong>${destName}</strong> on Invest.com.au. Click the button below to verify your email and submit your story for approval.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 32px; background-color: #15803d; color: #ffffff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">
          Verify My Story
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 16px 0 0 0; line-height: 1.5;">
        If you didn't submit this story, you can safely ignore this email.<br>
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

  const {
    source_broker_slug,
    dest_broker_slug,
    display_name,
    email,
    title,
    body: storyBody,
    reason,
    source_rating,
    dest_rating,
    estimated_savings,
    time_with_source,
  } = body as {
    source_broker_slug?: string;
    dest_broker_slug?: string;
    display_name?: string;
    email?: string;
    title?: string;
    body?: string;
    reason?: string;
    source_rating?: number;
    dest_rating?: number;
    estimated_savings?: string;
    time_with_source?: string;
  };

  // Validate required fields
  if (!source_broker_slug || typeof source_broker_slug !== 'string') {
    return NextResponse.json({ error: 'Source broker is required' }, { status: 400 });
  }
  if (!dest_broker_slug || typeof dest_broker_slug !== 'string') {
    return NextResponse.json({ error: 'Destination broker is required' }, { status: 400 });
  }
  if (source_broker_slug === dest_broker_slug) {
    return NextResponse.json({ error: 'Source and destination brokers must be different' }, { status: 400 });
  }
  if (!isValidEmail(email as string)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  if (!source_rating || typeof source_rating !== 'number' || source_rating < 1 || source_rating > 5 || !Number.isInteger(source_rating)) {
    return NextResponse.json({ error: 'Source broker rating must be 1-5' }, { status: 400 });
  }
  if (!dest_rating || typeof dest_rating !== 'number' || dest_rating < 1 || dest_rating > 5 || !Number.isInteger(dest_rating)) {
    return NextResponse.json({ error: 'Destination broker rating must be 1-5' }, { status: 400 });
  }
  if (!display_name || typeof display_name !== 'string' || display_name.trim().length < 2) {
    return NextResponse.json({ error: 'Display name is required (min 2 characters)' }, { status: 400 });
  }
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return NextResponse.json({ error: 'Title is required (min 3 characters)' }, { status: 400 });
  }
  if (!storyBody || typeof storyBody !== 'string' || storyBody.trim().length < 10) {
    return NextResponse.json({ error: 'Story body is required (min 10 characters)' }, { status: 400 });
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

  // Verify both brokers exist
  const [{ data: sourceBroker }, { data: destBroker }] = await Promise.all([
    supabase.from('brokers').select('id, name, slug').eq('slug', source_broker_slug).eq('status', 'active').single(),
    supabase.from('brokers').select('id, name, slug').eq('slug', dest_broker_slug).eq('status', 'active').single(),
  ]);

  if (!sourceBroker) {
    return NextResponse.json({ error: 'Source broker not found' }, { status: 404 });
  }
  if (!destBroker) {
    return NextResponse.json({ error: 'Destination broker not found' }, { status: 404 });
  }

  // Check for duplicate (same email + broker pair within 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const sanitizedEmail = (email as string).trim().toLowerCase().slice(0, 254);

  const { data: existing } = await supabase
    .from('switch_stories')
    .select('id')
    .eq('source_broker_slug', sourceBroker.slug)
    .eq('dest_broker_slug', destBroker.slug)
    .eq('email', sanitizedEmail)
    .gte('created_at', ninetyDaysAgo)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'You have already shared a story about this switch recently.' }, { status: 409 });
  }

  // Generate verification token
  const verificationToken = crypto.randomUUID();

  // Sanitize inputs
  const sanitizedName = sanitize(display_name, 50);
  const sanitizedTitle = sanitize(title, 120);
  const sanitizedBody = sanitize(storyBody, 2000);
  const sanitizedReason = reason ? sanitize(reason, 500) : null;
  const sanitizedSavings = estimated_savings ? sanitize(estimated_savings, 100) : null;
  const sanitizedTime = time_with_source ? sanitize(time_with_source, 100) : null;

  // Insert story
  const { error: insertError } = await supabase.from('switch_stories').insert({
    source_broker_id: sourceBroker.id,
    source_broker_slug: sourceBroker.slug,
    dest_broker_id: destBroker.id,
    dest_broker_slug: destBroker.slug,
    display_name: sanitizedName,
    email: sanitizedEmail,
    title: sanitizedTitle,
    body: sanitizedBody,
    reason: sanitizedReason,
    source_rating,
    dest_rating,
    estimated_savings: sanitizedSavings,
    time_with_source: sanitizedTime,
    verification_token: verificationToken,
    status: 'pending',
  });

  if (insertError) {
    console.error('switch_story insert error:', insertError.message);
    return NextResponse.json({ error: 'Failed to submit story' }, { status: 500 });
  }

  // Send verification email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://invest-com-au.vercel.app';
  const verifyUrl = `${siteUrl}/api/switch-story/verify?token=${verificationToken}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const html = buildVerificationEmail(sanitizedName, sourceBroker.name, destBroker.name, verifyUrl);
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Invest.com.au <fees@invest.com.au>',
          to: [sanitizedEmail],
          subject: `Verify your switching story — Invest.com.au`,
          html,
        }),
      });
    } catch (err) {
      console.error('Failed to send verification email:', err);
      // Non-blocking — the story is still saved
    }
  }

  return NextResponse.json({ success: true });
}
