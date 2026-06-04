import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

// Secret-gated cache-purge call. Each field is checked individually below
// (secret comparison, `Array.isArray` + per-entry guards, the `all` shortcut),
// so the schema only asserts the body is an object; `.passthrough()` keeps the
// `body.all` read working and a malformed body still throws → the existing 500.
const Body = z.object({}).passthrough();

/**
 * POST /api/revalidate
 * Purges the ISR cache for specific paths or tags.
 * Call this after admin makes changes (e.g. updating broker fees)
 * so the public pages reflect changes immediately instead of
 * waiting up to 1 hour for the revalidate timer.
 *
 * Body: { paths?: string[], tags?: string[], secret?: string }
 * Example: { paths: ["/broker/stake", "/compare"] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = Body.parse(await request.json());
    const { paths, tags, secret } = body;

    // Secret check — prevents random people from purging your cache
    const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
    if (!secret || secret !== REVALIDATE_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const revalidated: string[] = [];

    if (paths && Array.isArray(paths)) {
      for (const path of paths.slice(0, 20)) { // Max 20 paths per call
        if (typeof path === "string" && path.startsWith("/")) {
          revalidatePath(path);
          revalidated.push(path);
        }
      }
    }

    if (tags && Array.isArray(tags)) {
      for (const tag of tags.slice(0, 10)) {
        if (typeof tag === "string") {
          revalidateTag(tag, "default");
          revalidated.push(`tag:${tag}`);
        }
      }
    }

    // Common shortcut: revalidate "all" purges the most important pages
    if (body.all) {
      revalidatePath("/");
      revalidatePath("/compare");
      revalidatePath("/best/[slug]", "page");
      revalidatePath("/broker/[slug]", "page");
      revalidated.push("/", "/compare", "/best/*", "/broker/*");
    }

    return NextResponse.json({ revalidated, count: revalidated.length });
  } catch {
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}
