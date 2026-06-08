/*
 * Generic page screenshotter for visual self-verification.
 *
 * Why this exists: cloud/web Claude sessions have NO preinstalled browser, so
 * the `mcp__playwright`-based `design-reviewer` command can't run. This script
 * uses a locally-installed Playwright + Chromium instead, so the agent can
 * render the real page, screenshot it, and Read the PNG to actually SEE its
 * own changes — instead of guessing from the user's screenshots.
 *
 * Setup (once per fresh container — node_modules is gitignored):
 *   npm i -D playwright
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright install chromium
 *
 * Serve the site, then run this:
 *   (python3 -m http.server 8099 >/tmp/srv.log 2>&1 &)
 *   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scripts/screenshot.mjs \
 *     --url http://localhost:8099/index.html \
 *     --selector ".brands h2" \
 *     --center ".mark-circle" \
 *     --out /tmp/shot.png --width 1280 --height 820 --wait 2500
 *
 * Then: Read /tmp/shot.png to view it.
 *
 * Flags (all optional except --url):
 *   --url       page URL
 *   --selector  element to screenshot (default: full page)
 *   --center    selector to scroll to viewport centre first (triggers
 *               scroll-based animations / IntersectionObservers)
 *   --out       output PNG path (default /tmp/shot.png)
 *   --width/--height  viewport size (default 1280x820)
 *   --wait      ms to wait after scroll, for animations (default 1500)
 *   --full      pass to screenshot the full page
 */
import { chromium } from 'playwright';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? true : arr[i + 1]]);
    return acc;
  }, [])
);

if (!args.url) { console.error('Missing --url'); process.exit(1); }

const out = args.out || '/tmp/shot.png';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(args.width) || 1280, height: Number(args.height) || 820 }
});
await page.goto(args.url, { waitUntil: 'networkidle' }).catch(() => {});

if (args.center) {
  await page.evaluate((sel) => {
    document.querySelector(sel)?.scrollIntoView({ block: 'center' });
  }, args.center);
}
await page.waitForTimeout(Number(args.wait) || 1500);

if (args.selector && !args.full) {
  await page.locator(args.selector).first().screenshot({ path: out });
} else {
  await page.screenshot({ path: out, fullPage: !!args.full });
}
console.log('Saved', out);
await browser.close();
