/**
 * Xander Learning Hub — Standalone Video User Guide Generator
 *
 * Produces a single HD MP4 with screenshots + narrated audio.
 * No web integration — output is a video file you can share anywhere.
 *
 * Usage:
 *   cd docs
 *   npm install
 *   npx playwright install chromium
 *   copy .env.guide.example .env.guide   (optional — for admin/learner scenes)
 *   node generate-video-guide.mjs
 *
 * Output:
 *   video-guide/output/Xander-Learning-Hub-User-Guide.mp4
 */
import { chromium } from "playwright";
import { MsEdgeTTS, OUTPUT_FORMAT } from "edge-tts-node";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { spawn } from "child_process";
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "video-guide", "output");
const WORK_DIR = join(OUT_DIR, "work");
const SCENES_FILE = join(__dirname, "video-guide", "scenes.json");
const ENV_FILE = join(__dirname, ".env.guide");
const FFMPEG = ffmpegPath.path;

function loadEnv() {
  const env = {
    GUIDE_BASE_URL: "https://xanderglobalacademy.com",
    GUIDE_VOICE: "en-US-JennyNeural",
    GUIDE_ADMIN_EMAIL: "",
    GUIDE_ADMIN_PASSWORD: "",
    GUIDE_LEARNER_EMAIL: "",
    GUIDE_LEARNER_PASSWORD: "",
    GUIDE_INSTRUCTOR_EMAIL: "",
    GUIDE_INSTRUCTOR_PASSWORD: "",
  };
  if (existsSync(ENV_FILE)) {
    readFileSync(ENV_FILE, "utf8").split("\n").forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    });
  }
  return env;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err || `exit ${code}`))));
  });
}

async function generateTTS(text, outPath, voice) {
  try {
    const tts = new MsEdgeTTS({});
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    await tts.toFile(outPath, text);
    return;
  } catch (err) {
    console.log(`\n  ⚠ neural TTS unavailable (${err.message || "connect error"}), using Windows voice...`);
  }
  const wavPath = outPath.replace(/\.mp3$/i, ".wav");
  const safe = text.replace(/'/g, "''").replace(/\r?\n/g, " ");
  const ps = `Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate=1; $s.SetOutputToWaveFile('${wavPath.replace(/\\/g, "/")}'); $s.Speak('${safe}'); $s.Dispose()`;
  await run("powershell", ["-NoProfile", "-Command", ps]);
  await run(FFMPEG, ["-y", "-i", wavPath, "-b:a", "192k", outPath]);
}

async function renderTitleCard(page, scene, outPath, w, h) {
  const html = `<!DOCTYPE html><html><head><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:${w}px;height:${h}px;background:linear-gradient(135deg,#001A3D,#012F6B);
      font-family:'Segoe UI',Arial,sans-serif;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;overflow:hidden}
    .circle{position:absolute;top:8%;right:8%;width:320px;height:320px;border-radius:50%;background:#F2A65A;opacity:.12}
    h1{color:#fff;font-size:72px;font-weight:700;text-align:center;max-width:85%;line-height:1.15}
    h2{color:#F2A65A;font-size:36px;font-weight:400;margin-top:24px;text-align:center}
    .bar{position:absolute;bottom:0;left:0;right:0;height:28%;background:#F2A65A;display:flex;flex-direction:column;justify-content:center;align-items:center}
    .bar p{color:#012F6B;font-size:28px;font-weight:700}
    .bar span{color:#012F6B;font-size:20px;margin-top:8px;opacity:.8}
  </style></head><body>
    <div class="circle"></div>
    <h1>${(scene.title || "").replace(/</g, "&lt;")}</h1>
    ${scene.subtitle ? `<h2>${scene.subtitle.replace(/</g, "&lt;")}</h2>` : ""}
    <div class="bar"><p>Xander Global Scholars</p><span>xanderglobalacademy.com</span></div>
  </body></html>`;
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: outPath, fullPage: false });
}

async function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, ["-i", filePath, "-f", "null", "-"], { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d.toString(); });
    p.on("close", () => {
      const m = err.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (!m) return reject(new Error("Could not read audio duration"));
      resolve(
        parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 100
      );
    });
  });
}

async function imageToVideo(imagePath, audioPath, videoPath, duration) {
  const fadeOut = Math.max(0.3, duration - 0.5);
  const vf = [
    "scale=1920:1080:force_original_aspect_ratio=decrease",
    "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x001A3D",
    "fade=t=in:st=0:d=0.4",
    `fade=t=out:st=${fadeOut.toFixed(2)}:d=0.4`,
  ].join(",");

  await run(FFMPEG, [
    "-y", "-loop", "1", "-i", imagePath,
    "-i", audioPath,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    "-c:a", "aac", "-b:a", "192k",
    "-pix_fmt", "yuv420p",
    "-vf", vf,
    "-t", String(duration + 0.5),
    "-shortest",
    videoPath,
  ]);
}

async function concatVideos(segmentPaths, outPath) {
  const listFile = join(WORK_DIR, "concat.txt");
  writeFileSync(listFile, segmentPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
  await run(FFMPEG, [
    "-y", "-f", "concat", "-safe", "0", "-i", listFile,
    "-c", "copy", outPath,
  ]);
}

async function login(page, baseUrl, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
}

async function captureScreenshot(page, baseUrl, scene, outPath, w, h) {
  if (scene.type === "title") {
    await renderTitleCard(page, scene, outPath, w, h);
    return;
  }
  const url = scene.url.startsWith("http") ? scene.url : `${baseUrl}${scene.url}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(scene.wait || 3000);
  await page.screenshot({ path: outPath, fullPage: false });
}

// ── Main ──────────────────────────────────────────────────────────────────────
mkdirSync(WORK_DIR, { recursive: true });
const env = loadEnv();
const config = JSON.parse(readFileSync(SCENES_FILE, "utf8"));
const voice = env.GUIDE_VOICE || config.voice;
const baseUrl = env.GUIDE_BASE_URL;
const w = config.width || 1920;
const h = config.height || 1080;

const creds = {
  admin: env.GUIDE_ADMIN_EMAIL && env.GUIDE_ADMIN_PASSWORD
    ? { email: env.GUIDE_ADMIN_EMAIL, password: env.GUIDE_ADMIN_PASSWORD } : null,
  learner: env.GUIDE_LEARNER_EMAIL && env.GUIDE_LEARNER_PASSWORD
    ? { email: env.GUIDE_LEARNER_EMAIL, password: env.GUIDE_LEARNER_PASSWORD } : null,
  instructor: env.GUIDE_INSTRUCTOR_EMAIL && env.GUIDE_INSTRUCTOR_PASSWORD
    ? { email: env.GUIDE_INSTRUCTOR_EMAIL, password: env.GUIDE_INSTRUCTOR_PASSWORD } : null,
};

console.log("Xander Learning Hub — Video Guide Generator");
console.log("Base URL:", baseUrl);
console.log("Voice:", voice);
console.log("Resolution:", `${w}x${h}`);
console.log("");

const browser = await chromium.launch({ headless: true });
const segments = [];
let skipped = 0;

for (let i = 0; i < config.scenes.length; i++) {
  const scene = config.scenes[i];
  const idx = String(i + 1).padStart(2, "0");
  const id = scene.id || `scene-${i}`;

  if (scene.auth && !creds[scene.auth]) {
    console.log(`⊘ [${idx}] ${id} — skipped (no ${scene.auth} credentials in .env.guide)`);
    skipped++;
    continue;
  }

  console.log(`▶ [${idx}] ${scene.title || id}`);

  const imgPath = join(WORK_DIR, `${idx}-${id}.png`);
  const audioPath = join(WORK_DIR, `${idx}-${id}.mp3`);
  const segPath = join(WORK_DIR, `${idx}-${id}.mp4`);

  // Screenshot or title card
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  if (scene.auth && creds[scene.auth]) {
    await login(page, baseUrl, creds[scene.auth].email, creds[scene.auth].password);
  }

  await captureScreenshot(page, baseUrl, scene, imgPath, w, h);
  await context.close();

  // Narration audio
  process.stdout.write("  → generating narration... ");
  await generateTTS(scene.narration, audioPath, voice);
  const duration = await getAudioDuration(audioPath);
  console.log(`${duration.toFixed(1)}s`);

  // Video segment
  process.stdout.write("  → encoding segment... ");
  await imageToVideo(imgPath, audioPath, segPath, duration);
  console.log("done");

  segments.push(segPath);
}

await browser.close();

if (segments.length === 0) {
  console.error("\nNo segments created. Check scenes.json and credentials.");
  process.exit(1);
}

const finalPath = join(OUT_DIR, "Xander-Learning-Hub-User-Guide.mp4");
console.log(`\nMerging ${segments.length} segments...`);
await concatVideos(segments, finalPath);

console.log("\n✅ Standalone video ready:");
console.log("  ", finalPath);
if (skipped > 0) {
  console.log(`\n  (${skipped} authenticated scenes skipped — add credentials to .env.guide and re-run for full guide)`);
}
