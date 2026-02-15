import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.json();
  const { email, source } = body;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  const { error } = await supabase.from('email_captures').insert({
    email,
    source: source || 'website',
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
