import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { notificationFooter } from '@/lib/email-templates';

const log = logger('user-review');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@invest.com.au').split(',').map(e => e.trim().toLowerCase());

export async function POST(request: NextRequest) {
  // ── Auth check: require an authenticated admin user ──
  const supabaseAuth = await createServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { review_id, action, moderation_note } = body as {
    review_id?: number;
    action?: 'approve' | 'reject';
    moderation_note?: string;
  };

  if (!review_id || typeof review_id !== 'number') {
    return NextResponse.json({ error: 'review_id is required' }, { status: 400 });
  }
  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const { data, error } = await supabase
    .from('user_reviews')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      moderation_note: moderation_note ? String(moderation_note).slice(0, 500) : null,
    })
    .eq('id', review_id)
    .select('id, status')
    .single();

  if (error) {
    log.error('user_review moderate error', { error: error.message });
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  // Send email notification to reviewer
  if (process.env.RESEND_API_KEY) {
    const { data: review } = await supabase
      .from('user_reviews')
      .select('reviewer_name, reviewer_email, broker_slug, brokers(name)')
      .eq('id', review_id)
      .single();

    if (review?.reviewer_email) {
      const brokerName = ((review.brokers as { name: string }[] | null)?.[0])?.name || review.broker_slug;
      const firstName = (review.reviewer_name || 'there').split(' ')[0];

      if (action === 'approve') {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Invest.com.au <reviews@invest.com.au>',
            to: review.reviewer_email,
            subject: `Your review of ${brokerName} is now live`,
            html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto"><h2 style="color:#0f172a;font-size:16px">Review Published ✓</h2><p style="color:#64748b;font-size:14px">Hi ${firstName}, your review of <strong>${brokerName}</strong> has been approved and is now visible on the platform.</p><p style="color:#64748b;font-size:14px">Thank you for contributing — your feedback helps other investors make better decisions.</p>${notificationFooter(review.reviewer_email)}</div>`,
          }),
        }).catch(() => {});
      } else if (action === 'reject' && moderation_note) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Invest.com.au <reviews@invest.com.au>',
            to: review.reviewer_email,
            subject: `Update on your review of ${brokerName}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto"><h2 style="color:#0f172a;font-size:16px">Review Update</h2><p style="color:#64748b;font-size:14px">Hi ${firstName}, your review of <strong>${brokerName}</strong> was not published.</p>${moderation_note ? `<p style="background:#fef2f2;padding:10px;border-radius:6px;font-size:13px;color:#991b1b;border-left:3px solid #ef4444"><strong>Reason:</strong> ${moderation_note}</p>` : ''}<p style="color:#64748b;font-size:14px">You're welcome to submit a new review.</p>${notificationFooter(review.reviewer_email)}</div>`,
          }),
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ success: true, review: data });
}
