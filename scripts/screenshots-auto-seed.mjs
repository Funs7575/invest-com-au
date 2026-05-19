#!/usr/bin/env node

/**
 * Test users are pre-created in Supabase by the system admin.
 * You don't need to run this script — just go straight to auto-login.
 *
 * Test accounts (all use password: TestPassword123!@#):
 *   test-individual@invest-test.local
 *   test-advisor@invest-test.local
 *   test-broker@invest-test.local
 *   test-business@invest-test.local
 *   test-advertiser@invest-test.local
 *   test-author@invest-test.local
 *   test-admin@invest-test.local
 *
 * Next step: npm run screenshots:auto-login
 */

console.log("✅ Test users are pre-created in Supabase. No setup needed.");
console.log("");
console.log("Next step: npm run screenshots:auto-login");
console.log("");
console.log("Test accounts (password: TestPassword123!@#):");
const users = [
  "test-individual@invest-test.local",
  "test-advisor@invest-test.local",
  "test-broker@invest-test.local",
  "test-business@invest-test.local",
  "test-advertiser@invest-test.local",
  "test-author@invest-test.local",
  "test-admin@invest-test.local",
];
users.forEach((u) => console.log(`  ${u}`));
