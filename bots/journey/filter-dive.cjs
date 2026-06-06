/* eslint-disable */
/**
 * Interactive desktop UX/UI filter dive (in-session, judged by Claude).
 *
 * The link-crawler (ai-journey.cjs) only follows <a> links. This harness drives
 * the *interactive* directory controls — tabs, sort <select>, facet checkboxes,
 * search, filter drawer — on a single page, screenshotting + recording the
 * result-count / URL after each interaction so Claude can judge whether the
 * filtering UX gives clear feedback, sane states, and no dead-ends.
 *
 * Desktop viewport only (per the current task). Same money-path firewall as the
 * crawler — every write/affiliate/payment request is mocked against the live target.
 *
 *   NODE_PATH=node_modules JOURNEY_BASE=... JOURNEY_START=/compare JOURNEY_NAME=compare \
 *   node bots/journey/filter-dive.cjs
 */
const { chromium } = require("@playwright/test");
const fs = require("fs");

const BASE = process.env.JOURNEY_BASE || "https://lambent-sawine-17c3dd.netlify.app";
const START = process.env.JOURNEY_START || "/compare";
const NAME = process.env.JOURNEY_NAME || "filters";
const OUT = process.env.JOURNEY_OUT || "/tmp/journey/filters";
fs.mkdirSync(OUT, { recursive: true });

function shouldMock(url, method) {
  let path; try { path = new URL(url, BASE).pathname; } catch { return false; }
  const m = method.toUpperCase();
  const WRITE = m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
  if (/^\/go\//.test(path)) return "affiliate";
  if (/^\/api\/(affiliate\/click|track-click|ab-track|drip-click|attribution\/touch|form-event|track-event)\b/.test(path)) return "affiliate";
  if (/^\/api\/stripe\//.test(path) || /billing/i.test(path) || /checkout/i.test(path)) return "payment";
  if (/^\/api\/(account\/holdings\/sharesight|org-auth\/stripe-connect|webhooks\/)/.test(path)) return "external";
  if (/^\/api\/account\/(delete|documents)\b/.test(path)) return "destructive";
  if (WRITE && /^\/api\//.test(path)) return "write";
  return false;
}

// Snapshot the interactive surface + the live result-count / active filters.
const inventoryFn = () => {
  const txt = (el) => (el && el.textContent || "").replace(/\s+/g, " ").trim();
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
  const tabs = [...document.querySelectorAll('[role=tab]')].filter(vis).map((t, i) => ({ i, text: txt(t), selected: t.getAttribute("aria-selected") === "true" }));
  const selects = [...document.querySelectorAll("select")].filter(vis).map((s, i) => ({ i, label: s.getAttribute("aria-label") || s.name || s.id || "", value: s.value, options: [...s.options].map((o) => ({ value: o.value, label: txt(o) })) }));
  const checkboxes = [...document.querySelectorAll('input[type=checkbox]')].filter(vis).map((c, i) => { const lab = c.closest("label") || document.querySelector(`label[for='${c.id}']`); return { i, label: (lab ? txt(lab) : c.getAttribute("aria-label")) || c.name || "", checked: c.checked }; });
  const searches = [...document.querySelectorAll('input[type=search], input[type=text][placeholder]')].filter(vis).map((s, i) => ({ i, placeholder: s.getAttribute("placeholder") || "", value: s.value }));
  const filterButtons = [...document.querySelectorAll("button,[role=button]")].filter(vis).map((b) => txt(b) || b.getAttribute("aria-label") || "").filter((t) => /filter|sort|reset|clear|compare|apply|refine/i.test(t));
  const live = [...document.querySelectorAll('[aria-live]')].filter(vis).map((l) => txt(l)).filter(Boolean);
  const chips = (() => { const r = document.querySelector('[role=region][aria-label="Active filters"]'); return r && vis(r) ? [...r.querySelectorAll("button")].map((b) => txt(b)).filter(Boolean) : []; })();
  // Best-effort result-count: aria-live text, else count cards.
  const cards = document.querySelectorAll('[data-testid=compare-mobile-card], article, [class*="card" i]').length;
  return { url: location.href, h1: txt(document.querySelector("h1")), tabs, selects, checkboxes: checkboxes.slice(0, 40), searches, filterButtons: [...new Set(filterButtons)].slice(0, 20), live, chips, cardCount: cards };
};

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("user_onboarding_seen", "true"); localStorage.setItem("cookie-consent", "declined"); localStorage.setItem("inv_cookie_consent", "declined"); } catch {}
    try { sessionStorage.setItem("inv_newsletter_exit_intent_shown", "1"); } catch {}
  });
  const mocked = [];
  await ctx.route("**/*", (route) => {
    const req = route.request(); const cat = shouldMock(req.url(), req.method());
    if (cat) { mocked.push(cat); if (cat === "affiliate" && req.method() === "GET") return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>mocked</title>" }); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, mocked: true }) }); }
    return route.continue();
  });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error" && !/SSL certificate|ERR_CERT|net::ERR/i.test(m.text())) consoleErrors.push(m.text().slice(0, 200)); });

  const log = [];
  let n = 0;
  const snap = async (label) => {
    await page.waitForTimeout(900);
    const inv = await page.evaluate(inventoryFn);
    const shot = `${OUT}/${NAME}-${String(n).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.png`;
    try { await page.screenshot({ path: shot, fullPage: true }); } catch { await page.screenshot({ path: shot }); }
    log.push({ n, label, url: inv.url, live: inv.live, chips: inv.chips, cardCount: inv.cardCount, tabSelected: (inv.tabs.find((t) => t.selected) || {}).text, shot });
    console.log(`[${n}] ${label}  ::  live=${JSON.stringify(inv.live)} chips=${inv.chips.length} cards=${inv.cardCount} url=${inv.url.replace(BASE, "")}`);
    n++;
    return inv;
  };

  await page.goto(BASE + START, { waitUntil: "domcontentloaded", timeout: 40000 });
  const inv0 = await snap("baseline");
  console.log("INVENTORY:", JSON.stringify({ tabs: inv0.tabs.map((t) => t.text), selects: inv0.selects.map((s) => ({ label: s.label, options: s.options.map((o) => o.label) })), checkboxes: inv0.checkboxes.map((c) => c.label), searches: inv0.searches, filterButtons: inv0.filterButtons }, null, 2));

  // 1) Tabs
  for (let ti = 0; ti < Math.min(inv0.tabs.length, 6); ti++) {
    const tabs = await page.$$('[role=tab]');
    if (!tabs[ti]) break;
    const label = (await tabs[ti].textContent() || "").replace(/\s+/g, " ").trim().slice(0, 30);
    try { await tabs[ti].click({ timeout: 5000 }); } catch (e) { console.log("tab click fail", label, e.message.split("\n")[0]); continue; }
    await snap(`tab-${label}`);
  }

  // Return to first tab for the rest
  try { const t0 = await page.$$('[role=tab]'); if (t0[0]) await t0[0].click({ timeout: 3000 }); } catch {}
  await page.waitForTimeout(600);

  // 2) Sort selects — cycle through options
  const selCount = (await page.$$("select")).length;
  for (let si = 0; si < Math.min(selCount, 3); si++) {
    const cur = await page.$$("select");
    if (!cur[si]) break;
    const opts = await cur[si].$$eval("option", (os) => os.map((o) => o.value));
    const lbl = await cur[si].getAttribute("aria-label") || `select-${si}`;
    for (const v of opts.slice(0, 4)) {
      const s2 = await page.$$("select");
      if (!s2[si]) break;
      try { await s2[si].selectOption(v, { timeout: 4000 }); } catch { continue; }
      await snap(`${lbl}=${v}`.slice(0, 40));
    }
  }

  // 3) Facet checkboxes — toggle the first few, observe narrowing + chips
  const cbCount = (await page.$$('input[type=checkbox]')).length;
  for (let ci = 0; ci < Math.min(cbCount, 4); ci++) {
    const cbs = await page.$$('input[type=checkbox]');
    if (!cbs[ci]) break;
    try { await cbs[ci].scrollIntoViewIfNeeded({ timeout: 3000 }); await cbs[ci].check({ timeout: 4000, force: true }); } catch (e) { console.log("cb check fail", e.message.split("\n")[0]); continue; }
    await snap(`facet-check-${ci}`);
  }

  // 4) Search box
  const search = await page.$('input[type=search]');
  if (search) {
    try { await search.fill("vanguard", { timeout: 4000 }); await page.waitForTimeout(400); await page.keyboard.press("Enter"); } catch {}
    await snap("search-vanguard");
  }

  // 5) Clear / reset if present
  const clearBtn = await page.$('button:has-text("Clear"), button:has-text("Reset")');
  if (clearBtn) { try { await clearBtn.click({ timeout: 4000 }); } catch {} await snap("after-clear"); }

  await browser.close();
  const summary = { page: START, base: BASE, steps: log.length, consoleErrors: [...new Set(consoleErrors)], mockedCount: mocked.length, log };
  fs.writeFileSync(`${OUT}/${NAME}.json`, JSON.stringify(summary, null, 2));
  console.log(`\n=== FILTER DIVE COMPLETE: ${NAME} — ${log.length} snapshots ===`);
  console.log("console errors:", JSON.stringify([...new Set(consoleErrors)], null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
