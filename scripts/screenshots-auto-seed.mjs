#!/usr/bin/env node

/**
 * Auto-seed all auth states with mock users (no manual login needed).
 *
 * Creates test users in Supabase and generates authenticated sessions.
 * Usage: npm run screenshots:auto-seed
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const authDir = path.join(projectRoot, "e2e/visual/.auth");

const TEST_USERS = [
  {
    state: "user-individual",
    email: "test-individual@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "advisor",
    email: "test-advisor@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "broker",
    email: "test-broker@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "business",
    email: "test-business@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "advertiser",
    email: "test-advertiser@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "author",
    email: "test-author@invest-test.local",
    password: "TestPassword123!@#",
  },
  {
    state: "admin",
    email: "test-admin@invest-test.local",
    password: "TestPassword123!@#",
  },
];

async function ensureAuthDir() {
  try {
    await fs.mkdir(authDir, { recursive: true });
  } catch (err) {
    // ignore
  }
}

async function createTestUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  console.log("🔐 Creating/updating test users...\n");

  for (const user of TEST_USERS) {
    try {
      // Try to delete existing user first (clean slate)
      const { data: existing } = await admin.auth.admin.listUsers();
      const existingUser = existing?.users.find((u) => u.email === user.email);
      if (existingUser) {
        await admin.auth.admin.deleteUser(existingUser.id);
      }

      // Create fresh user
      const { data, error } = await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // auto-verify email
      });

      if (error) {
        console.error(`  ❌ ${user.state}: ${error.message}`);
        continue;
      }

      console.log(`  ✓ ${user.state}: ${user.email}`);
    } catch (err) {
      console.error(`  ❌ ${user.state}: ${err.message}`);
    }
  }

  console.log("\n✅ Test users ready. Run: npm run screenshots:auto-login\n");
}

await ensureAuthDir();
await createTestUsers();
