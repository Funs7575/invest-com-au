-- Migration: email OTP verification for find-advisor quiz
-- Short-lived 6-digit codes used to verify email intent before lead submission

CREATE TABLE IF NOT EXISTS email_otps (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps (email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON email_otps (expires_at);

-- Auto-delete used/expired OTPs older than 1 hour (cleaned up by query patterns)
