import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { notificationFooter } from '@/lib/email-templates';
import { getSiteUrl } from '@/lib/url';

const log = logger('switch-story');

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

  const { story_id, action, moderation_note } = body as {
    story_id?: number;
    action?: 'approve' | 'reject';
    moderation_note?: string;
  };

  if (!story_id || typeof story_id !== 'number') {
    return NextResponse.json({ error: 'story_id is required' }, { status: 400 });
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
    .from('switch_stories')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
      moderation_note: moderation_note ? String(moderation_note).slice(0, 500) : null,
    })
    .eq('id', story_id)
    .select('id, status')
    .single();

  if (error) {
    log.error('switch_story moderate error', { error: error.message });
    return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  const siteUrl = getSiteUrl();
  // Email the author about the moderation result
  if (process.env.RESEND_API_KEY) {
    const { data: story } = await supabase
      .from('switch_stories')
      .select('author_name, author_email, source_broker, dest_broker')
      .eq('id', story_id)
      .single();

    if (story?.author_email) {
      const firstName = (story.author_name || 'there').split(' ')[0];
      const storyDesc = `switching from ${story.source_broker || 'your old broker'} to ${story.dest_broker || 'your new broker'}`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Invest.com.au <stories@invest.com.au>',
          to: story.author_email,
          subject: action === 'approve' ? 'Your switch story is now live!' : 'Update on your switch story',
          html: action === 'approve'
            ? `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">Story Published ✓</h2><p style="color:#64748b;font-size:14px">Hi ${firstName}, your story about ${storyDesc} is now live on Invest.com.au. Thank you for sharing — it helps other investors making the same decision.</p><a href="${siteUrl}/switch" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">View Switch Stories →</a>${notificationFooter(story.author_email)}</div>`
            : `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">Story Update</h2><p style="color:#64748b;font-size:14px">Hi ${firstName}, your switch story was not published.${moderation_note ? `</p><p style="background:#fef2f2;padding:10px;border-radius:6px;font-size:13px;color:#991b1b;border-left:3px solid #ef4444"><strong>Reason:</strong> ${moderation_note}` : ''}</p><p style="color:#64748b;font-size:14px">You're welcome to submit a new story.</p>${notificationFooter(story.author_email)}</div>`,
        }),
      }).catch((err) => console.error("[switch-story] Moderation notification email failed:", err));
    }
  }

  return NextResponse.json({ success: true, story: data });
}
