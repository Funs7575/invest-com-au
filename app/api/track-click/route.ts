import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.json();
  const { broker_name, broker_slug, source, page } = body;

  if (!broker_slug) {
    return NextResponse.json({ error: 'Missing broker_slug' }, { status: 400 });
  }

  // Get broker ID
  const { data: broker } = await supabase
    .from('brokers')
    .select('id')
    .eq('slug', broker_slug)
    .single();

  const userAgent = request.headers.get('user-agent') || '';

  // Simple IP hash for analytics (not stored raw)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const ipHash = Buffer.from(ip).toString('base64');

  const { error } = await supabase.from('affiliate_clicks').insert({
    broker_id: broker?.id || null,
    broker_name: broker_name || broker_slug,
    broker_slug,
    source: source || 'website',
    page: page || '/',
    user_agent: userAgent,
    ip_hash: ipHash,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to track click' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
