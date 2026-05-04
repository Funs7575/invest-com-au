import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { detectDeviceType } from '@/lib/device-detect';
import { createRateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

const log = logger('tracking');

const isRateLimited = createRateLimiter(60_000, 30); // 30 clicks/min per IP

function hashIP(ip: string): string {
  // Use SHA-256 with a salt for irreversible hashing
  const salt = process.env.IP_HASH_SALT || 'invest-com-au-2026';
  if (!process.env.IP_HASH_SALT) log.warn('IP_HASH_SALT not set — using default. Set this env var in production.');
  return createHash('sha256').update(salt + ip).digest('hex').slice(0, 16);
}

const TrackClickBody = z.object({
  broker_slug: z.string().min(1),
  broker_name: z.string().optional(),
  source: z.string().optional(),
  page: z.string().optional(),
  layer: z.string().optional(),
  session_id: z.string().optional(),
  scenario: z.string().optional(),
  placement_type: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const bodyResult = TrackClickBody.safeParse(rawBody);
  if (!bodyResult.success) {
    return NextResponse.json({ error: 'Missing broker_slug' }, { status: 400 });
  }
  const { broker_slug, broker_name, source, page, layer, session_id, scenario, placement_type } = bodyResult.data;

  // Rate limit check
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = createAdminClient();

  // Get broker ID
  const { data: broker } = await supabase
    .from('brokers')
    .select('id')
    .eq('slug', broker_slug)
    .single();

  const userAgent = request.headers.get('user-agent') || '';
  const ipHash = hashIP(ip);
  const deviceType = detectDeviceType(userAgent);

  const { data: inserted, error } = await supabase.from('affiliate_clicks').insert({
    broker_id: broker?.id || null,
    broker_name: (typeof broker_name === 'string' ? broker_name : broker_slug).slice(0, 200),
    broker_slug: broker_slug.slice(0, 100),
    source: (typeof source === 'string' ? source : 'website').slice(0, 100),
    page: (typeof page === 'string' ? page : '/').slice(0, 500),
    layer: (typeof layer === 'string' ? layer : null)?.slice(0, 100) || null,
    user_agent: userAgent.slice(0, 500),
    ip_hash: ipHash,
    session_id: (typeof session_id === 'string' ? session_id : null)?.slice(0, 100) || null,
    device_type: deviceType,
    scenario: (typeof scenario === 'string' ? scenario : null)?.slice(0, 200) || null,
    placement_type: (typeof placement_type === 'string' ? placement_type : null)?.slice(0, 100) || null,
  }).select('click_id').single();

  if (error) {
    log.error('track-click insert error', { error: error.message });
    return NextResponse.json({ error: 'Failed to track click' }, { status: 500 });
  }

  return NextResponse.json({ success: true, click_id: inserted?.click_id || null });
}
