/**
 * Auto-login and save session for the video tour.
 * Usage: cd docs && node save-auth-session.mjs
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(__dirname, ".env.guide");
const OUT = join(__dirname, "video-guide", "auth-session.json");
const API = "https://api.xanderglobalscholars.com/api/admin";

function loadEnv() {
  const env = {
    GUIDE_BASE_URL: "https://xanderglobalacademy.com",
    GUIDE_ADMIN_EMAIL: "info@xanderglobalscholars.com",
    GUIDE_ADMIN_PASSWORD: "Xander@2026",
  };
  if (existsSync(ENV_FILE)) {
    readFileSync(ENV_FILE, "utf8").split("\n").forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && m[2].trim()) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    });
  }
  return env;
}

async function tryLogin(page, email, password) {
  await page.goto(`${loadEnv().GUIDE_BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);

  // Method 1: real keyboard typing (works with React)
  await page.locator("#email").click({ clickCount: 3 });
  await page.keyboard.type(email, { delay: 40 });
  await page.waitForTimeout(400);
  await page.locator("#password").click({ clickCount: 3 });
  await page.keyboard.type(password, { delay: 35 });
  await page.waitForTimeout(600);

  const apiResult = await page.evaluate(async ({ API, email, password }) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: email, password }),
      });
      const text = await res.text();
      if (!res.ok) return { ok: false, err: text.slice(0, 200) };
      const data = JSON.parse(text);
      localStorage.setItem("parrot_user_role", String(data.role || "admin").toLowerCase());
      localStorage.setItem("parrot_login_success", "1");
      localStorage.setItem("parrot_user_email", data.user?.email || email);
      localStorage.setItem("parrot_user_name", data.user?.name || "Admin");
      if (data.is_main_admin) localStorage.setItem("parrot_is_main_admin", "1");
      return { ok: true, role: data.role };
    } catch (e) {
      return { ok: false, err: String(e) };
    }
  }, { API, email, password });

  if (apiResult.ok) {
    await page.goto(`${loadEnv().GUIDE_BASE_URL}/dashboard/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    if (page.url().includes("/dashboard")) return true;
  }

  await page.locator("form.space-y-5 button[type='submit']").click();
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    return true;
  } catch {
    console.log("Login failed:", apiResult.err || "form submit did not reach dashboard");
    return false;
  }
}

mkdirSync(dirname(OUT), { recursive: true });
const env = loadEnv();
console.log("Logging in as:", env.GUIDE_ADMIN_EMAIL);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

const ok = await tryLogin(page, env.GUIDE_ADMIN_EMAIL, env.GUIDE_ADMIN_PASSWORD);
if (!ok) {
  await browser.close();
  process.exit(1);
}

await context.storageState({ path: OUT });
await browser.close();
console.log("✅ Session saved:", OUT);
