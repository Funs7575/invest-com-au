import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// --- Blocklist auto-moderation ---

// Common profanity / slurs (lowercase). Extend as needed.
const PROFANITY_LIST = [
  'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'dick', 'piss',
  'bastard', 'wanker', 'slut', 'whore', 'nigger', 'faggot', 'retard',
];

// Spam URL patterns
const SPAM_URL_REGEX = /https?:\/\/[^\s]+/i;

// Build a regex that matches any profanity as a whole word
const profanityRegex = new RegExp(
  `\\b(${PROFANITY_LIST.join('|')})\\b`,
  'i'
);

interface ReviewContent {
  title: string;
  body: string;
  pros: string | null;
  cons: string | null;
  display_name: string;
}

/**
 * Returns null if review passes moderation, or a reason string if it should
 * be held for manual review (stays as 'verified' instead of auto-approved).
 */
function checkBlocklist(review: ReviewContent): string | null {
  const allText = [review.title, review.body, review.pros, review.cons, review.display_name]
    .filter(Boolean)
    .join(' ');

  // 1. Profanity check
  if (profanityRegex.test(allText)) {
    return 'Contains profanity';
  }

  // 2. Spam URL check
  if (SPAM_URL_REGEX.test(allText)) {
    return 'Contains URL';
  }

  // 3. Body too short (< 20 chars after trim)
  if (review.body.trim().length < 20) {
    return 'Body too short';
  }

  // 4. Excessive caps (> 60% uppercase in body, min 30 chars)
  if (review.body.length >= 30) {
    const upperCount = (review.body.match(/[A-Z]/g) || []).length;
    const letterCount = (review.body.match(/[A-Za-z]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.6) {
      return 'Excessive caps';
    }
  }

  // 5. Repetitive characters (e.g. "aaaaaa" or "!!!!!!")
  if (/(.)\1{5,}/.test(allText)) {
    return 'Repetitive characters';
  }

  return null; // Passes — safe to auto-approve
}

// --- Route handler ---

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token || typeof token !== 'string' || token.length < 10) {
    return NextResponse.redirect(new URL('/?error=invalid_token', request.url));
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Lookup review by verification token (need full content for blocklist check)
  const { data: review } = await supabase
    .from('user_reviews')
    .select('id, broker_slug, status, title, body, pros, cons, display_name')
    .eq('verification_token', token)
    .single();

  if (!review) {
    return NextResponse.redirect(new URL('/?error=review_not_found', request.url));
  }

  // Only process if still pending
  if (review.status === 'pending') {
    // Run blocklist check
    const blockReason = checkBlocklist({
      title: review.title,
      body: review.body,
      pros: review.pros,
      cons: review.cons,
      display_name: review.display_name,
    });

    // Auto-approve if clean, otherwise hold as 'verified' for manual review
    const newStatus = blockReason ? 'verified' : 'approved';

    const { error } = await supabase
      .from('user_reviews')
      .update({
        status: newStatus,
        verified_at: new Date().toISOString(),
        ...(blockReason ? { moderation_note: `Auto-held: ${blockReason}` } : {}),
      })
      .eq('id', review.id);

    if (error) {
      console.error('user_review verify error:', error.message);
      return NextResponse.redirect(new URL('/?error=verification_failed', request.url));
    }
  }

  // Redirect to broker page with success param
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://invest-com-au.vercel.app';
  return NextResponse.redirect(new URL(`/broker/${review.broker_slug}?review_verified=1`, siteUrl));
}
