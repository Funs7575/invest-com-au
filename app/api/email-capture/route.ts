import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter (per-IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 300_000; // 5 minutes
const RATE_LIMIT_MAX = 5; // max 5 email captures per 5 minutes per IP

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

// Clean up stale entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

// RFC 5322 simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // RFC 5321
  return EMAIL_REGEX.test(email);
}

interface BrokerRow {
  name: string;
  asx_fee: string | null;
  us_fee: string | null;
  fx_rate: string | null;
  inactivity_fee: string | null;
  chess_sponsored: boolean;
  smsf_support: boolean;
  rating: string | null;
}

function buildFeeComparisonEmail(brokers: BrokerRow[]): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const brokerRows = brokers.map((b, i) => {
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    const fxDisplay = b.fx_rate ? `${parseFloat(b.fx_rate).toFixed(2)}%` : 'N/A';
    return `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${b.name}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${b.asx_fee || 'N/A'}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${b.us_fee || 'N/A'}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${fxDisplay}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${b.inactivity_fee || 'None'}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">${b.chess_sponsored ? '✅' : '❌'}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #15803d;">${b.rating ? `${b.rating}/5` : '–'}</td>
      </tr>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2026 Australian Broker Fee Comparison</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 720px; margin: 0 auto; padding: 24px 16px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #15803d 0%, #166534 100%); border-radius: 12px 12px 0 0; padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 800;">📊 2026 Broker Fee Comparison</h1>
      <p style="color: #bbf7d0; font-size: 14px; margin: 0;">Every ASIC-regulated platform — side by side</p>
      <p style="color: #86efac; font-size: 12px; margin: 8px 0 0 0;">Generated ${dateStr} by Invest.com.au</p>
    </div>

    <!-- Main content -->
    <div style="background: #ffffff; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Here's your complete fee comparison of every major Australian investment platform.
        All data is sourced directly from each broker's PDS and fee schedule.
      </p>

      <!-- Fee comparison table -->
      <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; min-width: 600px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid #15803d; color: #15803d; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Broker</th>
              <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid #15803d; color: #15803d; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">ASX Fee</th>
              <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid #15803d; color: #15803d; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">US Fee</th>
              <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid #15803d; color: #15803d; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">FX Rate</th>
              <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid #15803d; color: #15803d; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Inactivity</th>
              <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid #15803d; color: #15803d; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">CHESS</th>
              <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid #15803d; color: #15803d; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Rating</th>
            </tr>
          </thead>
          <tbody>
            ${brokerRows}
          </tbody>
        </table>
      </div>

      <!-- Key insights -->
      <div style="margin-top: 24px; padding: 16px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
        <h3 style="color: #15803d; font-size: 14px; margin: 0 0 8px 0; font-weight: 700;">💡 Key Takeaways</h3>
        <ul style="color: #334155; font-size: 13px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li><strong>Lowest ASX brokerage:</strong> CMC Markets and Moomoo at $0</li>
          <li><strong>Lowest FX rate:</strong> Interactive Brokers at 0.002% (ideal for US shares)</li>
          <li><strong>CHESS sponsored</strong> means your shares are held in your name — safer if the broker fails</li>
          <li><strong>Watch hidden fees:</strong> FX conversion costs can dwarf brokerage on international trades</li>
        </ul>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin-top: 24px;">
        <a href="https://invest.com.au/compare" style="display: inline-block; padding: 12px 32px; background-color: #f59e0b; color: #1e293b; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Compare All Brokers Live →</a>
      </div>

      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 24px 0 0 0; line-height: 1.5;">
        Invest.com.au is an independent comparison site. We may earn commissions from partner links.<br>
        All fee data sourced from official PDS documents. Fees may change — verify on the broker's website.<br>
        <a href="https://invest.com.au" style="color: #94a3b8;">invest.com.au</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendFeeComparisonEmail(toEmail: string, brokers: BrokerRow[]): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not set — skipping email send');
    return false;
  }

  const html = buildFeeComparisonEmail(brokers);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Invest.com.au <fees@invest.com.au>',
        to: [toEmail],
        subject: '📊 Your 2026 Broker Fee Comparison — Invest.com.au',
        html,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('Resend API error:', res.status, errorBody);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to send email via Resend:', err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Parse body with error handling
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, source } = body as { email?: string; source?: string };

  // Validate email properly
  if (!isValidEmail(email as string)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  // Rate limit check
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Sanitize and truncate inputs
  const sanitizedEmail = (email as string).trim().toLowerCase().slice(0, 254);
  const sanitizedSource = (typeof source === 'string' ? source : 'website').slice(0, 100);

  // Save email to database
  const { error } = await supabase.from('email_captures').insert({
    email: sanitizedEmail,
    source: sanitizedSource,
  });

  if (error) {
    console.error('email-capture insert error:', error.message);
    return NextResponse.json({ error: 'Failed to save email' }, { status: 500 });
  }

  // Fetch broker data and send fee comparison email
  let emailSent = false;
  try {
    const { data: brokers } = await supabase
      .from('brokers')
      .select('name, asx_fee, us_fee, fx_rate, inactivity_fee, chess_sponsored, smsf_support, rating')
      .eq('status', 'active')
      .order('rating', { ascending: false });

    if (brokers && brokers.length > 0) {
      emailSent = await sendFeeComparisonEmail(sanitizedEmail, brokers as BrokerRow[]);
    }
  } catch (err) {
    console.error('Error fetching brokers or sending email:', err);
  }

  return NextResponse.json({ success: true, emailSent });
}
