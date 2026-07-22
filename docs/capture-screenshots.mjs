/**
 * Capture live platform screenshots for the sales deck.
 * Requires: npm install playwright (run once in docs folder)
 *
 * Usage:
 *   cd docs
 *   node capture-screenshots.mjs
 *   node generate-sales-deck.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "screenshots");
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: "homepage", url: "https://xanderglobalacademy.com/", wait: 3000 },
  { name: "courses", url: "https://xanderglobalacademy.com/courses", wait: 3000 },
  { name: "meeting", url: "https://xanderglobalacademy.com/meeting-registration", wait: 4000 },
  { name: "signup", url: "https://xanderglobalacademy.com/signup", wait: 3000 },
  { name: "login", url: "https://xanderglobalacademy.com/login", wait: 2000 },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

for (const page of PAGES) {
  const tab = await context.newPage();
  try {
    await tab.goto(page.url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await tab.waitForTimeout(page.wait);
    const path = join(OUT, `${page.name}.png`);
    await tab.screenshot({ path, fullPage: false });
    console.log("✓", path);
  } catch (err) {
    console.error("✗", page.name, err.message);
  } finally {
    await tab.close();
  }
}

await browser.close();
console.log("\nDone. Regenerate deck: node generate-sales-deck.mjs");
