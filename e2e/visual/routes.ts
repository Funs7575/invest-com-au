import { promises as fs } from "node:fs";
import path from "node:path";
import { FIXTURE_FALLBACK, PARAM_FIXTURES } from "./fixtures";

const APP_DIR = path.resolve(process.cwd(), "app");

export async function discoverStaticRoutes(): Promise<string[]> {
  const routes: string[] = [];
  await walk(APP_DIR, "", routes);
  return Array.from(new Set(routes)).sort();
}

async function walk(dir: string, relRoute: string, out: string[]): Promise<void> {
  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const hasPage = entries.some(
    (e) => e.isFile() && /^page\.(tsx?|jsx?|mdx)$/.test(e.name),
  );
  if (hasPage) {
    out.push(relRoute === "" ? "/" : relRoute);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;
    if (entry.name === "api") continue;
    if (entry.name === "node_modules") continue;
    if (entry.name.startsWith("@")) continue;

    if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
      await walk(path.join(dir, entry.name), relRoute, out);
      continue;
    }
    if (entry.name.startsWith("(") && !entry.name.endsWith(")")) {
      continue;
    }

    const resolved = resolveSegment(entry.name);
    if (resolved === null) continue;
    await walk(path.join(dir, entry.name), `${relRoute}/${resolved}`, out);
  }
}

function resolveSegment(segment: string): string | null {
  if (segment.startsWith("[[") && segment.endsWith("]]")) {
    return null;
  }
  if (segment.startsWith("[...") && segment.endsWith("]")) {
    const key = segment.slice(4, -1);
    return PARAM_FIXTURES[key] ?? FIXTURE_FALLBACK;
  }
  if (segment.startsWith("[") && segment.endsWith("]")) {
    const key = segment.slice(1, -1);
    return PARAM_FIXTURES[key] ?? FIXTURE_FALLBACK;
  }
  return segment;
}
