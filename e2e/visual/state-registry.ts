import path from "node:path";
import { promises as fs } from "node:fs";

export interface AuthState {
  name: string;
  description: string;
  loginUrl: string;
  postLoginPattern: RegExp;
  storageStateFile: string;
}

const AUTH_DIR = path.resolve(process.cwd(), "e2e/visual/.auth");

/**
 * Shared password for every seeded test account. Single source of truth so the
 * Playwright auto-login flow and the service-role seed script (scripts/) stay in
 * lockstep. Test-only credential against a non-routable `*.invest-test.local`
 * domain — never a real secret. Override per-environment with TEST_USER_PASSWORD.
 */
export const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TestPassword123!@#";

/** Resolve the on-disk storageState path for a named auth state. */
export function stateFile(name: string): string {
  return path.join(AUTH_DIR, `${name}.json`);
}

export const ANONYMOUS_STATE = { name: "anonymous" } as const;

export const AUTH_STATES: AuthState[] = [
  {
    name: "user-individual",
    description: "Logged-in regular user (individual account type)",
    loginUrl: "/login",
    postLoginPattern: /\/(dashboard|account|$)/,
    storageStateFile: stateFile("user-individual"),
  },
  {
    name: "advisor",
    description: "Logged-in advisor (uses advisor_sessions table)",
    loginUrl: "/advisor-portal",
    postLoginPattern: /\/advisor-portal(\/|$)/,
    storageStateFile: stateFile("advisor"),
  },
  {
    name: "broker",
    description: "Logged-in broker (broker-portal)",
    loginUrl: "/broker-portal",
    postLoginPattern: /\/broker-portal(\/|$)/,
    storageStateFile: stateFile("broker"),
  },
  {
    name: "business",
    description: "Logged-in business listing manager (business-portal)",
    loginUrl: "/business-portal",
    postLoginPattern: /\/business-portal(\/|$)/,
    storageStateFile: stateFile("business"),
  },
  {
    name: "advertiser",
    description: "Logged-in advertiser (/advertise dashboard)",
    loginUrl: "/advertise",
    postLoginPattern: /\/advertise(\/|$)/,
    storageStateFile: stateFile("advertiser"),
  },
  {
    name: "author",
    description: "Logged-in content author",
    loginUrl: "/login",
    postLoginPattern: /\/(authors|dashboard|account)/,
    storageStateFile: stateFile("author"),
  },
  {
    name: "admin",
    description: "Admin (ADMIN_EMAILS allow-list + MFA)",
    loginUrl: "/admin",
    postLoginPattern: /\/admin(\/|$)/,
    storageStateFile: stateFile("admin"),
  },
  {
    name: "listing-owner",
    description: "Investment listing owner (my-listings portal)",
    loginUrl: "/login",
    postLoginPattern: /\/(account|dashboard|invest)(\/|$)/,
    storageStateFile: stateFile("listing-owner"),
  },
  {
    name: "firm-portal",
    description: "Advisor firm admin (firm-portal billing)",
    loginUrl: "/advisor-portal",
    postLoginPattern: /\/advisor-portal(\/|$)/,
    storageStateFile: stateFile("firm-portal"),
  },
  {
    name: "bot-buyer",
    description:
      "Dedicated bot-fleet individual investor — drives logged-in QA journeys (account, holdings, save-a-plan) with money auto-mocked",
    loginUrl: "/login",
    postLoginPattern: /\/(dashboard|account|$)/,
    storageStateFile: stateFile("bot-buyer"),
  },
];

export const ALL_STATE_NAMES = ["anonymous", ...AUTH_STATES.map((s) => s.name)];

export async function stateIsSeeded(state: AuthState): Promise<boolean> {
  try {
    await fs.access(state.storageStateFile);
    return true;
  } catch {
    return false;
  }
}

export function findState(name: string): AuthState | null {
  return AUTH_STATES.find((s) => s.name === name) ?? null;
}
