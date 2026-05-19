#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const stateName = process.argv[2];
if (!stateName) {
  console.error("Usage: npm run screenshots:seed -- <state-name>");
  console.error("");
  console.error("State names: user-individual, advisor, broker, business,");
  console.error("             advertiser, author, admin");
  process.exit(1);
}

const env = { ...process.env, SEED_STATE: stateName };
const config = path.join("e2e", "visual", "playwright.config.ts");
const spec = path.join("e2e", "visual", "seed-auth.spec.ts");

const child = spawn(
  "npx",
  ["playwright", "test", "--config", config, spec, "--headed"],
  { stdio: "inherit", env },
);

child.on("exit", (code) => process.exit(code ?? 0));
