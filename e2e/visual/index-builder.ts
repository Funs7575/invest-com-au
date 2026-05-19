import path from "node:path";
import { promises as fs } from "node:fs";

interface SnapshotEntry {
  state: string;
  routeSlug: string;
  route: string;
  viewports: { name: string; file: string; meta?: { redirected?: boolean; finalUrl?: string; status?: number } }[];
}

export async function buildIndex(runDir: string): Promise<string> {
  const states = await safeReaddir(runDir);
  const entries: SnapshotEntry[] = [];

  for (const state of states) {
    const stateDir = path.join(runDir, state);
    const routeSlugs = await safeReaddir(stateDir);
    for (const slug of routeSlugs) {
      const dir = path.join(stateDir, slug);
      const files = await safeReaddir(dir);
      const viewports: SnapshotEntry["viewports"] = [];
      for (const file of files) {
        if (!file.endsWith(".png")) continue;
        const viewportName = file.replace(/\.png$/, "");
        let meta: SnapshotEntry["viewports"][number]["meta"];
        try {
          const raw = await fs.readFile(path.join(dir, `${viewportName}.meta.json`), "utf8");
          meta = JSON.parse(raw);
        } catch {
          meta = undefined;
        }
        viewports.push({ name: viewportName, file: path.posix.join(state, slug, file), meta });
      }
      if (viewports.length === 0) continue;
      const routeFromMeta = viewports[0]?.meta && "route" in viewports[0].meta
        ? (viewports[0].meta as { route?: string }).route ?? slugToRoute(slug)
        : slugToRoute(slug);
      entries.push({ state, routeSlug: slug, route: routeFromMeta, viewports });
    }
  }

  const html = renderHtml(entries, path.basename(runDir));
  const indexPath = path.join(runDir, "index.html");
  await fs.writeFile(indexPath, html);
  return indexPath;
}

function slugToRoute(slug: string): string {
  if (slug === "_root") return "/";
  return "/" + slug.replace(/__/g, "/");
}

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() || e.isFile()).map((e) => e.name).sort();
  } catch {
    return [];
  }
}

function renderHtml(entries: SnapshotEntry[], date: string): string {
  const byState = new Map<string, SnapshotEntry[]>();
  for (const e of entries) {
    if (!byState.has(e.state)) byState.set(e.state, []);
    byState.get(e.state)!.push(e);
  }

  const stateSections = Array.from(byState.entries())
    .map(([state, rows]) => {
      const cards = rows
        .map((row) => {
          const thumbs = row.viewports
            .map(
              (v) =>
                `<a href="${escape(v.file)}" target="_blank"><img loading="lazy" src="${escape(v.file)}" alt="${escape(v.name)}" title="${escape(v.name)}"/></a>`,
            )
            .join("");
          const redirect =
            row.viewports[0]?.meta?.redirected
              ? `<span class="redir">↪ ${escape(row.viewports[0].meta?.finalUrl ?? "")}</span>`
              : "";
          return `<article><h3>${escape(row.route)}</h3>${redirect}<div class="thumbs">${thumbs}</div></article>`;
        })
        .join("");
      return `<section><h2>${escape(state)} <small>(${rows.length} routes)</small></h2><div class="grid">${cards}</div></section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>invest.com.au screenshots — ${escape(date)}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; background: #0a0a0a; color: #e7e7e7; }
  header { padding: 1rem 1.5rem; border-bottom: 1px solid #222; position: sticky; top: 0; background: #0a0a0a; z-index: 10; }
  h1 { margin: 0; font-size: 1.1rem; }
  section { padding: 1.5rem; border-bottom: 1px solid #222; }
  section h2 { margin: 0 0 1rem; font-size: 1.4rem; text-transform: capitalize; }
  small { color: #888; font-weight: normal; font-size: 0.85rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
  article { background: #161616; border-radius: 8px; padding: 0.75rem; overflow: hidden; }
  article h3 { margin: 0 0 0.4rem; font-size: 0.9rem; font-family: ui-monospace, monospace; word-break: break-all; }
  .redir { display: inline-block; font-size: 0.75rem; color: #f7a; margin-bottom: 0.5rem; font-family: ui-monospace, monospace; }
  .thumbs { display: flex; gap: 0.4rem; }
  .thumbs img { width: 33.33%; aspect-ratio: 9/16; object-fit: cover; object-position: top; border-radius: 4px; background: #222; }
  a { color: inherit; }
</style>
</head>
<body>
<header><h1>invest.com.au screenshots — ${escape(date)} (${entries.length} routes captured)</h1></header>
${stateSections}
</body>
</html>`;
}

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
