import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createRateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

const log = logger('tracking');

const isRateLimited = createRateLimiter(60_000, 60); // 60 events/min per IP

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'invest-com-au-2026';
  return createHash('sha256').update(salt + ip).digest('hex').slice(0, 16);
}

const ALLOWED_EVENTS = new Set([
  'quiz_start',
  'quiz_complete',
  'quiz_lead_capture',
  'calculator_use',
  'pdf_opt_in',
  'compare_select',
  'outbound_click',
  // Advisor funnel events
  'advisor_directory_view',
  'advisor_profile_view',
  'advisor_enquiry_submitted',
  'advisor_review_submitted',
  'advisor_signup_started',
  'advisor_signup_completed',
  // Broker funnel events
  'affiliate_click',
  'deal_claimed',
  'quiz_completed',
  // General page engagement
  'booking_click',
  'page_duration',
]);

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { event_type, event_data, page, session_id } = body as {
    event_type?: string;
    event_data?: Record<string, unknown>;
    page?: string;
    session_id?: string;
  };

  if (!event_type || typeof event_type !== 'string' || !ALLOWED_EVENTS.has(event_type)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const userAgent = request.headers.get('user-agent') || '';
  const ipHash = hashIP(ip);

  const { error } = await supabase.from('analytics_events').insert({
    event_type,
    event_data: event_data || {},
    page: (typeof page === 'string' ? page : '/').slice(0, 500),
    session_id: (typeof session_id === 'string' ? session_id : null)?.slice(0, 100) || null,
    ip_hash: ipHash,
    user_agent: userAgent.slice(0, 500),
  });

  if (error) {
    log.error('track-event insert error', { error: error.message });
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
