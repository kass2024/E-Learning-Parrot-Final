/**
 * Synced full-system video tour — each scene has matched narration + browsing.
 * Output: video-guide/output/Xander-Learning-Hub-Production-Guide-Final.mp4
 *
 * Usage:
 *   cd docs
 *   node save-auth-session.mjs
 *   npm run video-tour
 */
import { chromium } from "playwright";
import { MsEdgeTTS, OUTPUT_FORMAT } from "edge-tts-node";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "video-guide", "output");
const WORK_DIR = join(OUT_DIR, "sync-work");
const AUTH_STATE = join(__dirname, "video-guide", "auth-session.json");
const ENV_FILE = join(__dirname, ".env.guide");
const FFMPEG = ffmpegPath.path;
const W = 1920;
const H = 1080;

const CURSOR_SCRIPT = () => {
  if (document.getElementById("xander-guide-cursor")) return;
  const style = document.createElement("style");
  style.textContent = `
    #xander-guide-cursor{position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;transform:translate(-4px,-4px);filter:drop-shadow(0 2px 4px rgba(0,0,0,.45))}
    #xander-guide-cursor svg{width:28px;height:28px}
    #xander-guide-click-ring{position:fixed;width:36px;height:36px;border:3px solid #F2A65A;border-radius:50%;z-index:2147483646;pointer-events:none;transform:translate(-50%,-50%) scale(.4);opacity:0}
    #xander-guide-click-ring.pulse{animation:xgp .45s ease-out forwards}
    @keyframes xgp{0%{opacity:1;transform:translate(-50%,-50%) scale(.4)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.6)}}
  `;
  document.head.appendChild(style);
  const cursor = document.createElement("div");
  cursor.id = "xander-guide-cursor";
  cursor.innerHTML = `<svg viewBox="0 0 24 24"><path fill="#F2A65A" stroke="#012F6B" stroke-width="1.2" d="M4 2l14 8.5-6.2 1.4L11 20 4 2z"/></svg>`;
  document.body.appendChild(cursor);
  const ring = document.createElement("div");
  ring.id = "xander-guide-click-ring";
  document.body.appendChild(ring);
  window.__xanderGuide = {
    move(x, y) { cursor.style.left = x + "px"; cursor.style.top = y + "px"; },
    click(x, y) { ring.style.left = x + "px"; ring.style.top = y + "px"; ring.classList.remove("pulse"); void ring.offsetWidth; ring.classList.add("pulse"); },
  };
};

/** Each segment: narration plays exactly while these actions run */
const SEGMENTS = [
  {
    id: "intro", title: "Introduction", auth: false,
    narration: "Welcome to the Xander Learning Hub complete video guide. We will walk through the entire live platform at xanderglobalacademy dot com — the public website, login, admin dashboard, learner portal, and instructor tools.",
    async run(t) { await t.goto("/"); await t.pointAt("main h1, main").catch(() => {}); },
  },
  {
    id: "homepage", title: "Homepage", auth: false,
    narration: "This is the public homepage — the first impression for every student and partner. Notice the navigation bar, hero section, featured programs, and marketing banners. The promo strip and starburst offer are managed from the admin panel without any coding.",
    async run(t) {
      await t.goto("/");
      await t.pointAt("header nav").catch(() => {});
      await t.scrollDown(420);
      await t.pointAt("main a, main button").catch(() => {});
      await t.scrollDown(380);
    },
  },
  {
    id: "courses", title: "Course Catalog", auth: false,
    narration: "The Programs page is your online course catalog. Learners browse courses, compare prices, and enroll twenty-four seven. Each card shows the program name, description, and fee.",
    async run(t) {
      await t.goto("/courses");
      await t.pointAt("header nav a[href='/courses']").catch(() => {});
      await t.scrollDown(480);
      await t.pointAt("main article, main .grid > div").catch(() => {});
      await t.scrollDown(400);
    },
  },
  {
    id: "about", title: "About Page", auth: false,
    narration: "The About page tells your school's story — mission, values, and credentials. A professional About page builds trust with parents and corporate clients.",
    async run(t) {
      await t.goto("/about");
      await t.pointAt("header nav a[href='/about']").catch(() => {});
      await t.scrollDown(450);
      await t.pointAt("main").catch(() => {});
    },
  },
  {
    id: "signup", title: "Learner Signup", auth: false,
    narration: "The signup page guides new learners through registration. Students enter personal details, select a course and study shift, then submit. Staff approve applications from the admin dashboard.",
    async run(t) {
      await t.goto("/signup");
      await t.pointAt('input[type="email"], #email, form').catch(() => {});
      await t.scrollDown(380);
      await t.pointAt("form button, form select").catch(() => {});
    },
  },
  {
    id: "meeting", title: "Meeting Booking", auth: false,
    narration: "Prospects book consultations or webinars here. They pick a date and time, fill in their details, and submit. Staff approve requests in the admin panel and the system sends confirmation emails automatically.",
    async run(t) {
      await t.goto("/meeting-registration");
      await t.scrollDown(400);
      await t.pointAt("form, main").catch(() => {});
    },
  },
  {
    id: "login", title: "Login", auth: false,
    narration: "All users — administrators, instructors, and learners — sign in from this single login page. After authentication, each person is routed to the correct dashboard based on their role.",
    async run(t) {
      await t.goto("/login");
      await t.pointAt("#email");
      await t.pointAt("#password");
      await t.pointAt("form.space-y-5 button[type='submit']");
    },
  },
  {
    id: "admin-dashboard", title: "Admin Dashboard", auth: true,
    narration: "Now we enter the admin dashboard — your command center. Key metrics show students, enrollments, revenue, and courses. The sidebar gives access to every management area in the system.",
    async run(t) {
      await t.goto("/dashboard/admin");
      await t.scrollDown(320);
      await t.pointAt("main, [class*='dashboard']").catch(() => {});
    },
  },
  {
    id: "admin-students", title: "Student Management", auth: true,
    narration: "In Student Management, admins review signups, approve applications, manage enrollments, and mark payments. The View as Learner tool lets staff see exactly what any student sees.",
    async run(t) {
      await t.sidebar("/dashboard/students");
      await t.scrollDown(350);
      await t.pointAt("table, main").catch(() => {});
    },
  },
  {
    id: "admin-users", title: "User Management", auth: true,
    narration: "User Management controls all platform accounts — admins, instructors, staff, and coordinators. You can create users, assign roles, and manage access.",
    async run(t) {
      await t.sidebar("/dashboard/users");
      await t.pointAt("table, main").catch(() => {});
    },
  },
  {
    id: "admin-courses", title: "Courses", auth: true,
    narration: "The Courses section is where programs are created, priced, assigned to instructors, and published to the public catalog. Study shifts and cohort schedules are managed here too.",
    async run(t) {
      await t.sidebar("/dashboard/courses");
      await t.pointAt("table, main button").catch(() => {});
    },
  },
  {
    id: "admin-revenue", title: "Revenue & Payments", auth: true,
    narration: "Revenue Management tracks income across all programs. Payment Management shows every transaction, manual payment marking, and Stripe online payments.",
    async run(t) {
      await t.sidebar("/dashboard/revenue");
      await t.wait(1500);
      await t.sidebar("/dashboard/payments");
      await t.pointAt("main").catch(() => {});
    },
  },
  {
    id: "admin-zoom", title: "Zoom & Live Classes", auth: true,
    narration: "Zoom integration lets you schedule live classes with one click. Learners join from their dashboard — no manual link sharing. Live Classes shows all scheduled sessions.",
    async run(t) {
      await t.sidebar("/dashboard/zoom");
      await t.wait(1500);
      await t.sidebar("/dashboard/classes");
    },
  },
  {
    id: "admin-marketing", title: "Marketing", auth: true,
    narration: "Marketing Management controls the homepage promo banner and starburst offer. Changes publish instantly to the live website when you click publish.",
    async run(t) {
      await t.sidebar("/dashboard/marketing");
      await t.pointAt("main form, main").catch(() => {});
    },
  },
  {
    id: "admin-analytics", title: "Analytics", auth: true,
    narration: "Reports and Analytics show enrollment trends, revenue charts, and performance data to help you make informed decisions.",
    async run(t) {
      await t.sidebar("/dashboard/analytics");
      await t.pointAt("main").catch(() => {});
    },
  },
  {
    id: "admin-meetings", title: "Webinar Signups", auth: true,
    narration: "Webinar Signups lists every meeting booking request. Staff can approve, reschedule with an automatic apology email, or cancel appointments.",
    async run(t) {
      await t.sidebar("/dashboard/meeting-registrations");
      await t.pointAt("table, main").catch(() => {});
    },
  },
  {
    id: "learner-dashboard", title: "Learner Dashboard", auth: true,
    narration: "The learner dashboard is the student's personal hub. They see enrolled courses, upcoming live classes, payment status, and learning progress in one place.",
    async run(t) {
      await t.goto("/dashboard/learner");
      await t.scrollDown(300);
      await t.pointAt("main").catch(() => {});
    },
  },
  {
    id: "learner-courses", title: "Learner Courses & Certificates", auth: true,
    narration: "My Courses shows everything the learner is enrolled in. Materials and quizzes are accessed here. The Certificates section issues digital certificates with QR codes for verification.",
    async run(t) {
      await t.sidebar("/dashboard/my-courses");
      await t.wait(1500);
      await t.sidebar("/dashboard/learner/materials");
      await t.wait(1500);
      await t.sidebar("/dashboard/certificates");
    },
  },
  {
    id: "instructor-dashboard", title: "Instructor Portal", auth: true,
    narration: "The instructor portal is built for teachers and trainers. Instructors manage assigned courses, upload materials, create quizzes, and schedule live classes.",
    async run(t) {
      await t.goto("/dashboard/instructor");
      await t.pointAt("main").catch(() => {});
    },
  },
  {
    id: "instructor-tools", title: "Instructor Tools", auth: true,
    narration: "Instructors track their students, view earnings and payouts, and manage live class schedules. Everything needed to run a professional teaching operation.",
    async run(t) {
      await t.sidebar("/dashboard/my-courses");
      await t.wait(1200);
      await t.sidebar("/dashboard/instructor/quizzes");
      await t.wait(1200);
      await t.sidebar("/dashboard/instructor/students");
      await t.wait(1200);
      await t.sidebar("/dashboard/instructor/earnings");
    },
  },
  {
    id: "outro", title: "Conclusion", auth: false,
    narration: "You have now seen the complete Xander Learning Hub — public website, admin control panel, learner experience, and instructor tools. Contact info at xanderglobalscholars dot com or visit xanderglobalacademy dot com. Study, learn, and succeed globally.",
    async run(t) {
      await t.goto("/");
      await t.pointAt("main h1, main").catch(() => {});
    },
  },
];

function loadEnv() {
  const env = {
    GUIDE_BASE_URL: "https://xanderglobalacademy.com",
    GUIDE_VOICE: "en-US-JennyNeural",
  };
  if (existsSync(ENV_FILE)) {
    readFileSync(ENV_FILE, "utf8").split("\n").forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && m[2].trim()) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    });
  }
  return env;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error((err || "").slice(-900) || `exit ${code}`))));
  });
}

async function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ["-i", filePath, "-f", "null", "-"], { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d.toString(); });
    p.on("close", () => {
      const m = err.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (!m) return reject(new Error(`Duration unknown: ${filePath}`));
      resolve(parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 100);
    });
  });
}

async function generateTTS(text, outPath, voice) {
  try {
    const tts = new MsEdgeTTS({});
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    await tts.toFile(outPath, text);
    return;
  } catch {
    console.log("    (Windows voice)");
  }
  const wavPath = outPath.replace(/\.mp3$/i, ".wav");
  const safe = text.replace(/'/g, "''").replace(/\r?\n/g, " ");
  const ps = `Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate=-1; $s.SetOutputToWaveFile('${wavPath.replace(/\\/g, "/")}'); $s.Speak('${safe}'); $s.Dispose()`;
  await run("powershell", ["-NoProfile", "-Command", ps]);
  await run(FFMPEG, ["-y", "-i", wavPath, "-b:a", "192k", outPath]);
}

async function mergeSegment(webm, audio, outMp4, targetDur) {
  const videoDur = await getDuration(webm);
  let vIn = webm;
  if (videoDur < targetDur - 0.15) {
    const pad = (targetDur - videoDur).toFixed(2);
    const padded = webm.replace(/\.webm$/, "-pad.webm");
    await run(FFMPEG, ["-y", "-i", webm, "-vf", `tpad=stop_mode=clone:stop_duration=${pad}`, "-an", padded]);
    vIn = padded;
  }
  const t = Math.min(targetDur + 0.05, Math.max(videoDur, targetDur));
  await run(FFMPEG, [
    "-y", "-i", vIn, "-i", audio,
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-c:a", "aac", "-b:a", "192k", "-pix_fmt", "yuv420p",
    "-map", "0:v:0", "-map", "1:a:0",
    "-t", String(t),
    outMp4,
  ]);
}

async function concatSegments(paths, outPath) {
  const list = join(WORK_DIR, "concat.txt");
  writeFileSync(list, paths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
  await run(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", outPath]);
}

class Tour {
  constructor(page, baseUrl) {
    this.page = page;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }
  async wait(ms) { await this.page.waitForTimeout(ms); }
  async inject() { await this.page.addInitScript(CURSOR_SCRIPT); }
  async ensureCursor() { await this.page.evaluate(CURSOR_SCRIPT); }

  async move(x, y, steps = 28) {
    const start = await this.page.evaluate(() => ({
      x: parseFloat(document.getElementById("xander-guide-cursor")?.style.left) || innerWidth / 2,
      y: parseFloat(document.getElementById("xander-guide-cursor")?.style.top) || innerHeight / 2,
    })).catch(() => ({ x: 960, y: 540 }));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const cx = start.x + (x - start.x) * t;
      const cy = start.y + (y - start.y) * t;
      await this.page.mouse.move(cx, cy);
      await this.page.evaluate(({ cx, cy }) => window.__xanderGuide?.move(cx, cy), { cx, cy });
      await this.wait(10);
    }
  }

  async clickAt(x, y) {
    await this.move(x, y, 18);
    await this.page.evaluate(({ x, y }) => window.__xanderGuide?.click(x, y), { x, y });
    await this.page.mouse.click(x, y);
    await this.wait(300);
  }

  async centerOf(sel) {
    const el = this.page.locator(sel).first();
    await el.waitFor({ state: "visible", timeout: 12000 });
    const box = await el.boundingBox();
    if (!box) throw new Error(`No box: ${sel}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  async pointAt(sel) {
    const { x, y } = await this.centerOf(sel);
    await this.move(x, y);
    await this.wait(400);
    return { x, y };
  }

  async clickSel(sel) {
    const { x, y } = await this.pointAt(sel);
    await this.clickAt(x, y);
  }

  async goto(path) {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    for (let a = 1; a <= 3; a++) {
      try {
        await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
        break;
      } catch (e) {
        if (a === 3) throw e;
        await this.wait(2000);
      }
    }
    await this.ensureCursor();
    await this.wait(1800);
  }

  async scrollDown(px = 400) {
    for (let i = 0; i < 16; i++) {
      await this.page.mouse.wheel(0, px / 16);
      await this.wait(35);
    }
    await this.wait(500);
  }

  async navPublic(linkPattern) {
    const link = this.page.getByRole("link", { name: linkPattern }).first();
    await link.waitFor({ state: "visible", timeout: 10000 });
    const box = await link.boundingBox();
    if (box) await this.clickAt(box.x + box.width / 2, box.y + box.height / 2);
    await this.wait(2200);
  }

  async sidebar(path) {
    const link = this.page.locator(`a[href="${path}"]`).first();
    if (await link.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.pointAt(`a[href="${path}"]`);
      await this.clickSel(`a[href="${path}"]`);
      await this.wait(2200);
    } else {
      await this.goto(path);
    }
  }

  /** Hold last frame with gentle cursor drift until narration ends */
  async holdRemaining(seconds) {
    if (seconds <= 0.2) return;
    const steps = Math.min(20, Math.floor(seconds / 0.4));
    const cx = 960 + Math.random() * 200;
    const cy = 480 + Math.random() * 120;
    for (let i = 0; i < steps; i++) {
      await this.move(cx + i * 8, cy + i * 4, 8);
      await this.wait((seconds / steps) * 1000);
    }
  }
}

// ── Main: record each segment with synced narration ───────────────────────────
const SEG_ONLY = process.env.SEG_ONLY?.split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean);
if (!SEG_ONLY?.length) rmSync(WORK_DIR, { recursive: true, force: true });
mkdirSync(WORK_DIR, { recursive: true });

const env = loadEnv();
const baseUrl = env.GUIDE_BASE_URL;
const voice = env.GUIDE_VOICE || "en-US-JennyNeural";
const finalPath = join(OUT_DIR, "Xander-Learning-Hub-Production-Guide-Final.mp4");

if (!existsSync(AUTH_STATE)) {
  console.log("⚠ No auth session — run: node save-auth-session.mjs");
  console.log("  (Dashboard segments may fail without login)\n");
}

console.log("Xander Learning Hub — Synced Video Tour");
console.log(`Recording ${SEGMENTS.length} scenes with matched narration...\n`);

const browser = await chromium.launch({ headless: true, slowMo: 25 });
const segmentMp4s = [];

for (let i = 0; i < SEGMENTS.length; i++) {
  if (SEG_ONLY?.length && !SEG_ONLY.includes(i + 1)) continue;
  const seg = SEGMENTS[i];
  const idx = String(i + 1).padStart(2, "0");
  const audioPath = join(WORK_DIR, `${idx}-${seg.id}.mp3`);
  const webmPath = join(WORK_DIR, `${idx}-${seg.id}.webm`);
  const mp4Path = join(WORK_DIR, `${idx}-${seg.id}.mp4`);
  const segVideoDir = join(WORK_DIR, `vid-${idx}`);

  console.log(`▶ [${idx}/${SEGMENTS.length}] ${seg.title}`);

  process.stdout.write("  narration... ");
  await generateTTS(seg.narration, audioPath, voice);
  const audioDur = await getDuration(audioPath);
  console.log(`${audioDur.toFixed(1)}s`);

  const ctxOpts = {
    viewport: { width: W, height: H },
    recordVideo: { dir: segVideoDir, size: { width: W, height: H } },
  };
  if (seg.auth && existsSync(AUTH_STATE)) ctxOpts.storageState = AUTH_STATE;

  mkdirSync(segVideoDir, { recursive: true });
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  const tour = new Tour(page, baseUrl);
  await tour.inject();

  const t0 = Date.now();
  process.stdout.write("  recording... ");
  try {
    await seg.run(tour);
  } catch (e) {
    console.log(`warn: ${e.message}`);
  }
  const elapsed = (Date.now() - t0) / 1000;
  const remaining = audioDur - elapsed - 0.2;
  await tour.holdRemaining(remaining);

  const video = page.video();
  await context.close();
  const rawVid = await video.path();
  if (existsSync(rawVid)) renameSync(rawVid, webmPath);

  process.stdout.write("merge... ");
  await mergeSegment(webmPath, audioPath, mp4Path, audioDur);
  console.log("done");
  segmentMp4s.push(mp4Path);
}

await browser.close();

console.log("\n▶ Assembling final video...");
const allMp4s = SEG_ONLY?.length
  ? readdirSync(WORK_DIR)
      .filter((f) => /^\d{2}-.+\.mp4$/.test(f))
      .sort()
      .map((f) => join(WORK_DIR, f))
  : segmentMp4s;
await concatSegments(allMp4s, finalPath);
const totalDur = await getDuration(finalPath);
console.log(`\n✅ Synced tour ready (${Math.floor(totalDur / 60)}m ${Math.round(totalDur % 60)}s):`);
console.log("  ", finalPath);
