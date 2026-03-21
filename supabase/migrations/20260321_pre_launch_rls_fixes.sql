-- Pre-launch: Enable RLS on tables missing it + add policies
-- Tables from 003_broker_portal_features.sql that were missed

-- ── broker_creatives ────────────────────────────────────────
ALTER TABLE IF EXISTS broker_creatives ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'broker_creatives' AND policyname = 'Service role full access broker_creatives') THEN
    CREATE POLICY "Service role full access broker_creatives" ON broker_creatives FOR ALL USING (false);
  END IF;
END $$;

-- ── ab_tests ────────────────────────────────────────────────
ALTER TABLE IF EXISTS ab_tests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ab_tests' AND policyname = 'Service role full access ab_tests') THEN
    CREATE POLICY "Service role full access ab_tests" ON ab_tests FOR ALL USING (false);
  END IF;
END $$;

-- ── broker_notifications ────────────────────────────────────
ALTER TABLE IF EXISTS broker_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'broker_notifications' AND policyname = 'Service role full access broker_notifications') THEN
    CREATE POLICY "Service role full access broker_notifications" ON broker_notifications FOR ALL USING (false);
  END IF;
END $$;

-- ── support_tickets ─────────────────────────────────────────
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Service role full access support_tickets') THEN
    CREATE POLICY "Service role full access support_tickets" ON support_tickets FOR ALL USING (false);
  END IF;
END $$;

-- ── support_messages ────────────────────────────────────────
ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Service role full access support_messages') THEN
    CREATE POLICY "Service role full access support_messages" ON support_messages FOR ALL USING (false);
  END IF;
END $$;

-- ── sponsor_invoices ────────────────────────────────────────
ALTER TABLE IF EXISTS sponsor_invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sponsor_invoices' AND policyname = 'Service role full access sponsor_invoices') THEN
    CREATE POLICY "Service role full access sponsor_invoices" ON sponsor_invoices FOR ALL USING (false);
  END IF;
END $$;
