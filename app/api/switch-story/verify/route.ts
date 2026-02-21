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

interface StoryContent {
  title: string;
  body: string;
  reason: string | null;
  display_name: string;
}

/**
 * Returns null if story passes moderation, or a reason string if it should
 * be held for manual review (stays as 'verified' instead of auto-approved).
 */
function checkBlocklist(story: StoryContent): string | null {
  const allText = [story.title, story.body, story.reason, story.display_name]
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
  if (story.body.trim().length < 20) {
    return 'Body too short';
  }

  // 4. Excessive caps (> 60% uppercase in body, min 30 chars)
  if (story.body.length >= 30) {
    const upperCount = (story.body.match(/[A-Z]/g) || []).length;
    const letterCount = (story.body.match(/[A-Za-z]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.6) {
      return 'Excessive caps';
    }
  }

  // 5. Repetitive characters (e.g. "aaaaaa" or "!!!!!!")
  if (/(.)\\1{5,}/.test(allText)) {
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

  // Lookup story by verification token
  const { data: story } = await supabase
    .from('switch_stories')
    .select('id, dest_broker_slug, status, title, body, reason, display_name')
    .eq('verification_token', token)
    .single();

  if (!story) {
    return NextResponse.redirect(new URL('/?error=story_not_found', request.url));
  }

  // Only process if still pending
  if (story.status === 'pending') {
    // Run blocklist check
    const blockReason = checkBlocklist({
      title: story.title,
      body: story.body,
      reason: story.reason,
      display_name: story.display_name,
    });

    // Auto-approve if clean, otherwise hold as 'verified' for manual review
    const newStatus = blockReason ? 'verified' : 'approved';

    const { error } = await supabase
      .from('switch_stories')
      .update({
        status: newStatus,
        verified_at: new Date().toISOString(),
        ...(blockReason ? { moderation_note: `Auto-held: ${blockReason}` } : {}),
      })
      .eq('id', story.id);

    if (error) {
      console.error('switch_story verify error:', error.message);
      return NextResponse.redirect(new URL('/?error=verification_failed', request.url));
    }
  }

  // Redirect to broker page with success param
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://invest-com-au.vercel.app';
  return NextResponse.redirect(new URL(`/broker/${story.dest_broker_slug}?story_verified=1`, siteUrl));
}
