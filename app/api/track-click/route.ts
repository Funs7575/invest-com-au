import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

// In-memory rate limiter (per-IP, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max 30 clicks per minute per IP

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

// Clean up stale entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

function hashIP(ip: string): string {
  // Use SHA-256 with a salt for irreversible hashing
  const salt = process.env.IP_HASH_SALT || 'invest-com-au-2026';
  return createHash('sha256').update(salt + ip).digest('hex').slice(0, 16);
}

export async function POST(request: NextRequest) {
  // Parse body with error handling
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { broker_name, broker_slug, source, page, layer } = body as {
    broker_name?: string;
    broker_slug?: string;
    source?: string;
    page?: string;
    layer?: string;
  };

  if (!broker_slug || typeof broker_slug !== 'string') {
    return NextResponse.json({ error: 'Missing broker_slug' }, { status: 400 });
  }

  // Rate limit check
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get broker ID
  const { data: broker } = await supabase
    .from('brokers')
    .select('id')
    .eq('slug', broker_slug)
    .single();

  const userAgent = request.headers.get('user-agent') || '';
  const ipHash = hashIP(ip);

  const { error } = await supabase.from('affiliate_clicks').insert({
    broker_id: broker?.id || null,
    broker_name: (typeof broker_name === 'string' ? broker_name : broker_slug).slice(0, 200),
    broker_slug: broker_slug.slice(0, 100),
    source: (typeof source === 'string' ? source : 'website').slice(0, 100),
    page: (typeof page === 'string' ? page : '/').slice(0, 500),
    layer: (typeof layer === 'string' ? layer : null)?.slice(0, 100) || null,
    user_agent: userAgent.slice(0, 500),
    ip_hash: ipHash,
  });

  if (error) {
    console.error('track-click insert error:', error.message);
    return NextResponse.json({ error: 'Failed to track click' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
