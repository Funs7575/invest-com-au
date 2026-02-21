import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token || typeof token !== 'string' || token.length < 10) {
    return NextResponse.redirect(new URL('/?error=invalid_token', request.url));
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Lookup review by verification token
  const { data: review } = await supabase
    .from('user_reviews')
    .select('id, broker_slug, status')
    .eq('verification_token', token)
    .single();

  if (!review) {
    return NextResponse.redirect(new URL('/?error=review_not_found', request.url));
  }

  // Only verify if still pending
  if (review.status === 'pending') {
    const { error } = await supabase
      .from('user_reviews')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
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
