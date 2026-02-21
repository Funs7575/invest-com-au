import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

  // Use service role client (admin auth is handled by Supabase RLS + admin middleware)
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
    console.error('switch_story moderate error:', error.message);
    return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, story: data });
}
