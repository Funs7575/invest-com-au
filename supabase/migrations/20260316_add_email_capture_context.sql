-- Add context column to email_captures for storing calculator/quiz inputs alongside the email
-- This enables personalised nurture sequences based on what the user was calculating
ALTER TABLE email_captures ADD COLUMN IF NOT EXISTS context JSONB;
