import PptxGenJS from "pptxgenjs";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = join(__dirname, "screenshots");

// Brand palette
const NAVY = "012F6B";
const NAVY_DEEP = "001A3D";
const NAVY_LIGHT = "1E4A8C";
const ORANGE = "F2A65A";
const ORANGE_DARK = "E08B3A";
const WHITE = "FFFFFF";
const CREAM = "FFFBF5";
const SLATE = "64748B";
const SLATE_DARK = "334155";
const LIGHT_BG = "F8FAFC";
const GREEN = "059669";
const GOLD = "D97706";

const FONT = "Segoe UI";
const pptx = new PptxGenJS();
pptx.author = "Xander Global Scholars";
pptx.company = "Xander Learning Hub";
pptx.title = "Xander Learning Hub — Sales Pitch (Final)";
pptx.subject = "E-Learning Platform Sales Deck";
pptx.layout = "LAYOUT_16x9";

let slideCounter = 0;

function addFooter(slide) {
  slideCounter += 1;
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 5.35, w: 10, h: 0.02, fill: { color: ORANGE },
  });
  slide.addText("Xander Learning Hub  ·  xanderglobalacademy.com  ·  info@xanderglobalscholars.com", {
    x: 0.4, y: 5.12, w: 8.8, h: 0.28, fontSize: 7.5, color: SLATE, align: "center", fontFace: FONT,
  });
  slide.addText(String(slideCounter), {
    x: 9.15, y: 5.12, w: 0.5, h: 0.28, fontSize: 7.5, color: SLATE, align: "right", fontFace: FONT,
  });
}

function accentBar(slide, y = 0, h = 5.625) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y, w: 0.12, h, fill: { color: ORANGE } });
}

function headerBand(slide, title, subtitle) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: subtitle ? 1.05 : 0.88, fill: { color: NAVY } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: subtitle ? 1.05 : 0.88, w: 10, h: 0.04, fill: { color: ORANGE } });
  slide.addText(title, {
    x: 0.5, y: 0.14, w: 9, h: 0.55, fontSize: 22, bold: true, color: WHITE, fontFace: FONT,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.62, w: 9, h: 0.35, fontSize: 11, color: "CBD5E1", fontFace: FONT,
    });
  }
}

function titleSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: NAVY_DEEP };
  // Decorative shapes
  slide.addShape(pptx.ShapeType.ellipse, { x: 7.2, y: -0.8, w: 4, h: 4, fill: { color: NAVY_LIGHT, transparency: 60 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: -1.5, y: 3.5, w: 3.5, h: 3.5, fill: { color: ORANGE, transparency: 75 } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 4.35, w: 10, h: 1.3, fill: { color: ORANGE } });
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.55, w: 1.8, h: 0.06, fill: { color: ORANGE } });
  slide.addText("XANDER LEARNING HUB", {
    x: 0.5, y: 0.85, w: 9, h: 0.95, fontSize: 46, bold: true, color: WHITE, fontFace: FONT,
  });
  slide.addText("Run Your Entire School Online —\nEnroll, Teach, Get Paid, Certify", {
    x: 0.5, y: 1.95, w: 8.8, h: 1.1, fontSize: 24, color: "E2E8F0", fontFace: FONT,
  });
  slide.addText("The only platform built for language schools, training academies & education franchises", {
    x: 0.5, y: 3.15, w: 8.5, h: 0.55, fontSize: 13, italic: true, color: "94A3B8", fontFace: FONT,
  });
  slide.addText("Study · Learn · Succeed Globally", {
    x: 0.5, y: 4.55, w: 8, h: 0.45, fontSize: 17, bold: true, color: NAVY, fontFace: FONT,
  });
  slide.addText("Live at xanderglobalacademy.com  ·  2026", {
    x: 0.5, y: 5.0, w: 8, h: 0.3, fontSize: 10, color: NAVY, fontFace: FONT,
  });
}

function sectionSlide(num, title, subtitle) {
  const slide = pptx.addSlide();
  slide.background = { color: NAVY };
  accentBar(slide);
  slide.addShape(pptx.ShapeType.ellipse, { x: 8, y: 0.5, w: 2.5, h: 2.5, fill: { color: NAVY_LIGHT, transparency: 50 } });
  slide.addText(String(num).padStart(2, "0"), {
    x: 0.55, y: 1.2, w: 2, h: 1.2, fontSize: 72, bold: true, color: ORANGE, fontFace: FONT,
  });
  slide.addText(title, {
    x: 0.55, y: 2.35, w: 8.5, h: 0.9, fontSize: 34, bold: true, color: WHITE, fontFace: FONT,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.55, y: 3.35, w: 8, h: 0.7, fontSize: 15, color: "CBD5E1", fontFace: FONT,
    });
  }
}

function painSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: CREAM };
  headerBand(slide, "Your prospects are losing money every day", "Sound familiar?");

  const pains = [
    { icon: "💸", title: "Revenue leaks", text: "Manual payments & follow-ups — students drop off before they pay" },
    { icon: "🔀", title: "Tool chaos", text: "Zoom + WhatsApp + spreadsheets — nothing talks to each other" },
    { icon: "😕", title: "Unprofessional image", text: "Learners judge credibility in 3 seconds — a weak site costs enrollments" },
    { icon: "⏳", title: "Staff burnout", text: "Hours wasted on admin instead of teaching" },
    { icon: "📉", title: "Can't scale", text: "Adding a new campus or partner means starting from scratch" },
    { icon: "🏗️", title: "Build vs. buy trap", text: "Custom dev costs $20K+ and takes 6–12 months" },
  ];

  pains.forEach((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.35 + col * 3.15;
    const y = 1.25 + row * 2.05;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 2.95, h: 1.85, fill: { color: WHITE }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1,
      shadow: { type: "outer", blur: 4, offset: 2, angle: 45, color: "000000", opacity: 0.08 },
    });
    slide.addText(p.icon, { x: x + 0.15, y: y + 0.12, w: 0.5, h: 0.4, fontSize: 18 });
    slide.addText(p.title, { x: x + 0.15, y: y + 0.5, w: 2.65, h: 0.3, fontSize: 12, bold: true, color: NAVY, fontFace: FONT });
    slide.addText(p.text, { x: x + 0.15, y: y + 0.82, w: 2.65, h: 0.9, fontSize: 9.5, color: SLATE_DARK, fontFace: FONT, valign: "top" });
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.35, y: 4.55, w: 9.3, h: 0.5, fill: { color: NAVY }, rectRadius: 0.08,
  });
  slide.addText("💡 Hook: \"What if one platform enrolled students, collected payment, ran live classes, and issued certificates — under your brand, live this week?\"", {
    x: 0.5, y: 4.62, w: 9, h: 0.38, fontSize: 10, bold: true, color: WHITE, fontFace: FONT,
  });
  addFooter(slide);
}

function solutionSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  headerBand(slide, "One platform. Zero chaos. Total control.", "Already live — not a roadmap slide");

  const pillars = [
    { title: "Attract", desc: "Stunning website, course catalog & meeting booking", color: NAVY },
    { title: "Enroll", desc: "Online signup, Stripe payments, instant confirmation", color: NAVY_LIGHT },
    { title: "Teach", desc: "Live Zoom classes, materials, quizzes & recordings", color: ORANGE_DARK },
    { title: "Grow", desc: "Analytics, partner portals & marketing banners", color: ORANGE },
  ];

  pillars.forEach((p, i) => {
    const x = 0.35 + i * 2.35;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.2, w: 2.2, h: 3.2, fill: { color: p.color }, rectRadius: 0.12,
      shadow: { type: "outer", blur: 6, offset: 3, angle: 45, color: "000000", opacity: 0.12 },
    });
    slide.addText(p.title, {
      x: x + 0.1, y: 1.4, w: 2, h: 0.45, fontSize: 18, bold: true, color: WHITE, align: "center", fontFace: FONT,
    });
    slide.addText(p.desc, {
      x: x + 0.12, y: 2.0, w: 1.95, h: 2.2, fontSize: 10, color: "F1F5F9", align: "center", valign: "top", fontFace: FONT,
    });
  });

  slide.addText("Admin · Instructor · Learner · Partner — every role, one login ecosystem", {
    x: 0.5, y: 4.55, w: 9, h: 0.35, fontSize: 11, bold: true, color: NAVY, align: "center", fontFace: FONT,
  });
  addFooter(slide);
}

function impactStatsSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: NAVY_DEEP };
  slide.addText("The impact schools see", {
    x: 0.5, y: 0.35, w: 9, h: 0.55, fontSize: 26, bold: true, color: WHITE, align: "center", fontFace: FONT,
  });

  const stats = [
    { n: "5 days", label: "To go live", sub: "From signup to first enrolled student" },
    { n: "70%", label: "Less admin time", sub: "Automated enrollments, payments & emails" },
    { n: "3×", label: "More enrollments", sub: "Professional online presence converts better" },
    { n: "1", label: "Platform replaces 5+", sub: "LMS, Zoom, payments, booking, certificates" },
  ];

  stats.forEach((s, i) => {
    const x = 0.45 + (i % 2) * 4.75;
    const y = 1.15 + Math.floor(i / 2) * 2.1;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 4.4, h: 1.85, fill: { color: NAVY_LIGHT }, line: { color: ORANGE, width: 2 }, rectRadius: 0.12,
    });
    slide.addText(s.n, {
      x: x + 0.2, y: y + 0.2, w: 4, h: 0.7, fontSize: 36, bold: true, color: ORANGE, fontFace: FONT,
    });
    slide.addText(s.label, {
      x: x + 0.2, y: y + 0.85, w: 4, h: 0.35, fontSize: 15, bold: true, color: WHITE, fontFace: FONT,
    });
    slide.addText(s.sub, {
      x: x + 0.2, y: y + 1.2, w: 4, h: 0.5, fontSize: 10, color: "CBD5E1", fontFace: FONT,
    });
  });
  addFooter(slide);
}

function audienceSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: LIGHT_BG };
  headerBand(slide, "Built for education businesses that mean business");

  const segments = [
    { emoji: "🌍", title: "Language Schools", text: "IELTS, TOEFL, DELF, business English" },
    { emoji: "🎓", title: "Training Academies", text: "Professional & vocational programs" },
    { emoji: "🏢", title: "Corporate L&D", text: "Upskill teams with proof of completion" },
    { emoji: "🤝", title: "Franchise Networks", text: "White-label portals per partner school" },
    { emoji: "🚀", title: "EdTech Startups", text: "Launch fast without building from scratch" },
    { emoji: "🏛️", title: "NGOs & Government", text: "Skills programs at national scale" },
  ];

  segments.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.35 + col * 3.15;
    const y = 1.2 + row * 2.0;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 2.95, h: 1.75, fill: { color: WHITE }, line: { color: NAVY, width: 0.5 }, rectRadius: 0.1,
    });
    slide.addText(s.emoji, { x: x + 0.15, y: y + 0.15, w: 0.4, h: 0.35, fontSize: 16 });
    slide.addText(s.title, { x: x + 0.15, y: y + 0.5, w: 2.65, h: 0.3, fontSize: 12, bold: true, color: NAVY, fontFace: FONT });
    slide.addText(s.text, { x: x + 0.15, y: y + 0.82, w: 2.65, h: 0.75, fontSize: 9.5, color: SLATE, fontFace: FONT });
  });
  addFooter(slide);
}

function platformScreenshotSlide(title, benefit, caption, imageName, mockup) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  headerBand(slide, title, benefit);

  const imgPath = join(SCREENSHOT_DIR, imageName);
  const frame = { x: 0.35, y: 1.15, w: 6.5, h: 3.65 };

  slide.addShape(pptx.ShapeType.roundRect, {
    ...frame, fill: { color: "F1F5F9" }, line: { color: NAVY_LIGHT, width: 2 }, rectRadius: 0.08,
    shadow: { type: "outer", blur: 8, offset: 4, angle: 45, color: "000000", opacity: 0.15 },
  });
  slide.addShape(pptx.ShapeType.rect, { x: frame.x, y: frame.y, w: frame.w, h: 0.26, fill: { color: NAVY } });
  slide.addText("●  ●  ●", { x: frame.x + 0.1, y: frame.y + 0.04, w: 0.7, h: 0.18, fontSize: 7, color: ORANGE });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: frame.x + 0.9, y: frame.y + 0.05, w: 3.2, h: 0.16, fill: { color: NAVY_LIGHT }, rectRadius: 0.05,
  });
  slide.addText("xanderglobalacademy.com", {
    x: frame.x + 0.9, y: frame.y + 0.04, w: 3.2, h: 0.18, fontSize: 7, color: WHITE, align: "center",
  });

  if (existsSync(imgPath)) {
    slide.addImage({ path: imgPath, x: frame.x + 0.04, y: frame.y + 0.28, w: frame.w - 0.08, h: frame.h - 0.32 });
  } else if (mockup) {
    mockup(slide, frame.x + 0.04, frame.y + 0.28, frame.w - 0.08, frame.h - 0.32);
  }

  // Benefit callout panel
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 7.05, y: 1.15, w: 2.6, h: 3.65, fill: { color: NAVY }, rectRadius: 0.1,
  });
  slide.addText("Why it matters", {
    x: 7.2, y: 1.35, w: 2.3, h: 0.3, fontSize: 10, bold: true, color: ORANGE, fontFace: FONT,
  });
  slide.addText(caption, {
    x: 7.2, y: 1.75, w: 2.3, h: 2.8, fontSize: 11, color: WHITE, valign: "top", fontFace: FONT,
  });

  addFooter(slide);
}

function drawDashboardMockup(slide, x, y, w, h) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w: w * 0.2, h, fill: { color: NAVY } });
  ["Dashboard", "Students", "Courses", "Payments", "Zoom", "Reports"].forEach((m, i) => {
    slide.addText(m, { x: x + 0.06, y: y + 0.2 + i * 0.22, w: w * 0.17, h: 0.18, fontSize: 7, color: i === 0 ? ORANGE : "CBD5E1" });
  });
  slide.addShape(pptx.ShapeType.rect, { x: x + w * 0.2, y, w: w * 0.8, h, fill: { color: WHITE } });
  slide.addText("Command Center", { x: x + w * 0.24, y: y + 0.1, w: 3, h: 0.28, fontSize: 11, bold: true, color: NAVY });
  [{ l: "Active Students", v: "248", c: NAVY }, { l: "Monthly Revenue", v: "$12.4K", c: GREEN }, { l: "Live Courses", v: "18", c: ORANGE_DARK }].forEach((k, i) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + w * 0.24 + i * 1.3, y: y + 0.45, w: 1.15, h: 0.6, fill: { color: LIGHT_BG }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.06,
    });
    slide.addText(k.v, { x: x + w * 0.24 + i * 1.3 + 0.08, y: y + 0.52, w: 1, h: 0.28, fontSize: 13, bold: true, color: k.c });
    slide.addText(k.l, { x: x + w * 0.24 + i * 1.3 + 0.08, y: y + 0.78, w: 1, h: 0.18, fontSize: 6.5, color: SLATE });
  });
}

function caseStudySlide(client, sector, metric, challenge, solution, results, quote, author) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.0, fill: { color: NAVY } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 1.0, w: 10, h: 0.04, fill: { color: ORANGE } });
  slide.addText("CLIENT SUCCESS", { x: 0.45, y: 0.12, w: 2.5, h: 0.25, fontSize: 9, bold: true, color: ORANGE, fontFace: FONT });
  slide.addText(client, { x: 0.45, y: 0.38, w: 6.5, h: 0.5, fontSize: 22, bold: true, color: WHITE, fontFace: FONT });
  slide.addText(sector, { x: 6.8, y: 0.42, w: 2.7, h: 0.35, fontSize: 9, color: "CBD5E1", align: "right", fontFace: FONT });

  // Hero metric
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 1.2, w: 2.2, h: 1.5, fill: { color: ORANGE }, rectRadius: 0.1,
  });
  slide.addText(metric.value, {
    x: 0.4, y: 1.35, w: 2.2, h: 0.7, fontSize: 32, bold: true, color: NAVY, align: "center", fontFace: FONT,
  });
  slide.addText(metric.label, {
    x: 0.4, y: 2.0, w: 2.2, h: 0.5, fontSize: 9, bold: true, color: NAVY, align: "center", fontFace: FONT,
  });

  const blocks = [
    { title: "The Problem", text: challenge, x: 2.8 },
    { title: "What We Did", text: solution, x: 5.5 },
    { title: "The Win", text: results, x: 8.2 },
  ];
  blocks.forEach((b) => {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: b.x - 0.15, y: 1.2, w: 2.5, h: 2.5, fill: { color: LIGHT_BG }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.08,
    });
    slide.addText(b.title, { x: b.x, y: 1.32, w: 2.2, h: 0.28, fontSize: 10, bold: true, color: NAVY, fontFace: FONT });
    slide.addText(b.text, { x: b.x, y: 1.65, w: 2.2, h: 1.9, fontSize: 9, color: SLATE_DARK, valign: "top", fontFace: FONT });
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.4, y: 3.9, w: 9.2, h: 0.95, fill: { color: NAVY_DEEP }, rectRadius: 0.08,
  });
  slide.addText(`"${quote}"`, {
    x: 0.55, y: 4.0, w: 8.9, h: 0.55, fontSize: 11, italic: true, color: WHITE, fontFace: FONT,
  });
  slide.addText(`— ${author}`, {
    x: 0.55, y: 4.55, w: 8.9, h: 0.25, fontSize: 9, color: ORANGE, fontFace: FONT,
  });
  addFooter(slide);
}

function pricingTableSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: CREAM };
  headerBand(slide, "Simple pricing. Serious value.", "No hidden fees · Cancel anytime · Annual plans save 20%");

  const plans = [
    {
      name: "Launch",
      tagline: "Perfect for pilots",
      price: "$199",
      period: "/month",
      highlight: false,
      features: ["Up to 100 learners", "5 courses · 2 instructors", "Stripe payments & receipts", "Zoom live classes", "Certificates & quizzes", "Email support"],
    },
    {
      name: "Scale",
      tagline: "Most schools choose this",
      price: "$399",
      period: "/month",
      highlight: true,
      features: ["Up to 500 learners", "Unlimited courses & staff", "Revenue & analytics dashboard", "Zoom recordings & cohorts", "Marketing banners & promos", "Meeting booking & webinars", "Priority support · 2-hr response"],
    },
    {
      name: "Enterprise",
      tagline: "For networks & franchises",
      price: "Let's talk",
      period: "",
      highlight: false,
      features: ["Unlimited everything", "Partner institution portals", "Full white-label branding", "Dedicated onboarding manager", "2-day team training included", "Custom integrations & API", "SLA + named account manager"],
    },
  ];

  plans.forEach((p, i) => {
    const x = 0.32 + i * 3.18;
    const fill = p.highlight ? NAVY : WHITE;
    const textColor = p.highlight ? WHITE : NAVY;
    const h = p.highlight ? 4.05 : 3.85;

    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: p.highlight ? 0.92 : 1.02, w: 3.0, h,
      fill: { color: fill },
      line: { color: p.highlight ? ORANGE : "E2E8F0", width: p.highlight ? 3 : 1 },
      rectRadius: 0.12,
      shadow: p.highlight ? { type: "outer", blur: 10, offset: 4, angle: 45, color: "000000", opacity: 0.2 } : undefined,
    });

    if (p.highlight) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x + 0.55, y: 0.78, w: 1.9, h: 0.3, fill: { color: ORANGE }, rectRadius: 0.1,
      });
      slide.addText("⭐ BEST VALUE", {
        x: x + 0.55, y: 0.8, w: 1.9, h: 0.26, fontSize: 8, bold: true, color: NAVY, align: "center", fontFace: FONT,
      });
    }

    slide.addText(p.name, { x: x + 0.12, y: (p.highlight ? 1.08 : 1.18), w: 2.76, h: 0.35, fontSize: 18, bold: true, color: textColor, align: "center", fontFace: FONT });
    slide.addText(p.tagline, { x: x + 0.12, y: (p.highlight ? 1.42 : 1.52), w: 2.76, h: 0.22, fontSize: 8.5, color: p.highlight ? ORANGE : SLATE, align: "center", fontFace: FONT, italic: true });
    slide.addText(p.price, { x: x + 0.12, y: (p.highlight ? 1.68 : 1.78), w: 2.76, h: 0.55, fontSize: 30, bold: true, color: p.highlight ? ORANGE : NAVY, align: "center", fontFace: FONT });
    if (p.period) {
      slide.addText(p.period, { x: x + 0.12, y: (p.highlight ? 2.18 : 2.28), w: 2.76, h: 0.2, fontSize: 9, color: p.highlight ? "CBD5E1" : SLATE, align: "center", fontFace: FONT });
    }
    slide.addText(
      p.features.map((f) => ({ text: `✓  ${f}`, options: { fontSize: 9, color: p.highlight ? "E2E8F0" : SLATE_DARK, breakLine: true, paraSpaceAfter: 4 } })),
      { x: x + 0.1, y: (p.highlight ? 2.42 : 2.52), w: 2.8, h: 2.3, valign: "top" }
    );
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.35, y: 5.0, w: 9.3, h: 0.38, fill: { color: GREEN }, rectRadius: 0.06,
  });
  slide.addText("🎁 Limited offer: Free setup + 2-day training for new schools signing before September 2026", {
    x: 0.5, y: 5.05, w: 9, h: 0.28, fontSize: 9.5, bold: true, color: WHITE, align: "center", fontFace: FONT,
  });
  addFooter(slide);
}

function roiSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: NAVY_DEEP };
  slide.addText("Stop paying for 5 tools. Start growing.", {
    x: 0.5, y: 0.3, w: 9, h: 0.55, fontSize: 26, bold: true, color: WHITE, align: "center", fontFace: FONT,
  });

  const before = [
    { name: "Website + LMS (Teachable/Moodle)", cost: 79 },
    { name: "Zoom Business", cost: 22 },
    { name: "Calendly / booking tool", cost: 15 },
    { name: "Payment + invoicing tools", cost: 35 },
    { name: "Certificate / quiz platform", cost: 29 },
    { name: "Developer maintenance", cost: 50 },
  ];
  const totalBefore = before.reduce((s, t) => s + t.cost, 0);

  slide.addText("WITHOUT XANDER", { x: 0.5, y: 0.95, w: 4.2, h: 0.3, fontSize: 10, bold: true, color: "FCA5A5", fontFace: FONT });
  before.forEach((t, i) => {
    const y = 1.3 + i * 0.42;
    slide.addText(t.name, { x: 0.5, y, w: 3.2, h: 0.3, fontSize: 10, color: "CBD5E1", fontFace: FONT });
    slide.addText(`$${t.cost}/mo`, { x: 3.5, y, w: 1, h: 0.3, fontSize: 10, color: "FCA5A5", align: "right", fontFace: FONT });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.5, y: y + 0.32, w: (t.cost / 80) * 3.5, h: 0.06, fill: { color: "FCA5A5" },
    });
  });
  slide.addText(`Total: ~$${totalBefore}+/month`, {
    x: 0.5, y: 3.95, w: 4.2, h: 0.35, fontSize: 14, bold: true, color: "FCA5A5", fontFace: FONT,
  });

  slide.addShape(pptx.ShapeType.rect, { x: 4.95, y: 1.0, w: 0.04, h: 3.3, fill: { color: ORANGE } });

  slide.addText("WITH XANDER SCALE", { x: 5.2, y: 0.95, w: 4.5, h: 0.3, fontSize: 10, bold: true, color: ORANGE, fontFace: FONT });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 5.2, y: 1.35, w: 4.3, h: 2.2, fill: { color: NAVY_LIGHT }, rectRadius: 0.12, line: { color: ORANGE, width: 2 },
  });
  slide.addText("$399", {
    x: 5.2, y: 1.55, w: 4.3, h: 0.8, fontSize: 48, bold: true, color: ORANGE, align: "center", fontFace: FONT,
  });
  slide.addText("/month — everything included", {
    x: 5.2, y: 2.35, w: 4.3, h: 0.35, fontSize: 12, color: WHITE, align: "center", fontFace: FONT,
  });
  slide.addText("Website · LMS · Zoom · Payments · Booking · Certificates · Analytics · Support", {
    x: 5.35, y: 2.75, w: 4, h: 0.6, fontSize: 9, color: "CBD5E1", align: "center", fontFace: FONT,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 5.2, y: 3.75, w: 4.3, h: 0.55, fill: { color: GREEN }, rectRadius: 0.08,
  });
  slide.addText(`Save $${totalBefore - 399}+/month · ROI in the first enrollment cycle`, {
    x: 5.2, y: 3.82, w: 4.3, h: 0.42, fontSize: 11, bold: true, color: WHITE, align: "center", fontFace: FONT,
  });
  addFooter(slide);
}

function trustSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  headerBand(slide, "Why schools trust Xander Global Scholars");

  const reasons = [
    { title: "Live & battle-tested", desc: "Running in production at xanderglobalacademy.com — show, don't tell" },
    { title: "Built for your market", desc: "African & global timezones, local payment flows, multilingual-ready" },
    { title: "Human onboarding", desc: "2-day Zero-to-Hero training — your team confident on day 3" },
    { title: "Partner-ready", desc: "Sell school-in-a-box with white-label portals per franchise" },
    { title: "All-in-one stack", desc: "Zoom + Stripe + certificates + booking — no plugin puzzle" },
    { title: "Real support", desc: "Book a meeting on the site — talk to humans, not chatbots" },
  ];

  reasons.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.4 + col * 4.85;
    const y = 1.15 + row * 1.35;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 4.55, h: 1.15, fill: { color: LIGHT_BG }, line: { color: NAVY, width: 0.5 }, rectRadius: 0.08,
    });
    slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.12, y: y + 0.28, w: 0.35, h: 0.35, fill: { color: ORANGE } });
    slide.addText("✓", { x: x + 0.12, y: y + 0.26, w: 0.35, h: 0.35, fontSize: 12, bold: true, color: NAVY, align: "center" });
    slide.addText(r.title, { x: x + 0.58, y: y + 0.15, w: 3.8, h: 0.3, fontSize: 12, bold: true, color: NAVY, fontFace: FONT });
    slide.addText(r.desc, { x: x + 0.58, y: y + 0.48, w: 3.8, h: 0.55, fontSize: 9.5, color: SLATE, fontFace: FONT });
  });
  addFooter(slide);
}

function objectionSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: LIGHT_BG };
  headerBand(slide, "Handle any objection with confidence");

  const rows = [
    ["\"It's too expensive\"", "One enrollment often covers a month. Show the ROI slide — they save $230+/mo vs. 5 tools."],
    ["\"We need more time\"", "Pilot in 5 days: 1 course, 20 learners, your logo. Low risk, high proof."],
    ["\"We're not technical\"", "2-day training included. Admin is click-based — if you can use email, you can run this."],
    ["\"We already use Moodle\"", "Moodle doesn't do Zoom cohorts, Stripe, partner portals & meeting booking in one UX."],
    ["\"What about our data?\"", "Secure cloud hosting. Each institution's data is scoped and isolated."],
    ["\"Can we brand it?\"", "Yes — logo, colors, custom portal URL. Partners get their own subdomain."],
  ];

  rows.forEach((r, i) => {
    const y = 1.15 + i * 0.68;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.4, y, w: 9.2, h: 0.58, fill: { color: WHITE }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.06,
    });
    slide.addText(r[0], { x: 0.55, y: y + 0.1, w: 2.8, h: 0.38, fontSize: 10, bold: true, color: NAVY, fontFace: FONT });
    slide.addText(r[1], { x: 3.5, y: y + 0.1, w: 5.9, h: 0.38, fontSize: 9.5, color: SLATE_DARK, fontFace: FONT });
  });
  addFooter(slide);
}

function demoFlowSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  headerBand(slide, "Your 15-minute winning demo", "Practice until it's second nature");

  const steps = [
    { n: "1", t: "Wow them", d: "Homepage + promo banner + star offer (2 min)" },
    { n: "2", t: "Enroll", d: "Live signup — pick course & shift (2 min)" },
    { n: "3", t: "Control", d: "Admin approves student & marks paid (3 min)" },
    { n: "4", t: "Learn", d: "Learner dashboard — materials & live class (2 min)" },
    { n: "5", t: "Prove", d: "Certificate + Zoom recording (2 min)" },
    { n: "6", t: "Capture", d: "Meeting booking → approval email (2 min)" },
    { n: "7", t: "Close", d: "Pricing + case study + pilot date (2 min)" },
  ];

  steps.forEach((s, i) => {
    const x = 0.35 + (i % 4) * 2.35;
    const y = 1.15 + Math.floor(i / 4) * 2.0;
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.75, y, w: 0.55, h: 0.55, fill: { color: ORANGE },
    });
    slide.addText(s.n, { x: x + 0.75, y: y + 0.08, w: 0.55, h: 0.4, fontSize: 16, bold: true, color: NAVY, align: "center", fontFace: FONT });
    slide.addText(s.t, { x, y: y + 0.62, w: 2.05, h: 0.28, fontSize: 11, bold: true, color: NAVY, align: "center", fontFace: FONT });
    slide.addText(s.d, { x, y: y + 0.9, w: 2.05, h: 0.85, fontSize: 8.5, color: SLATE, align: "center", fontFace: FONT });
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.35, y: 4.55, w: 9.3, h: 0.48, fill: { color: NAVY }, rectRadius: 0.08,
  });
  slide.addText("Close line: \"Your school could be live with your first paying student by next Friday. Shall we book your pilot?\"", {
    x: 0.5, y: 4.62, w: 9, h: 0.35, fontSize: 10, bold: true, color: WHITE, align: "center", fontFace: FONT,
  });
  addFooter(slide);
}

function ctaSlide() {
  const slide = pptx.addSlide();
  slide.background = { color: NAVY_DEEP };
  slide.addShape(pptx.ShapeType.ellipse, { x: -1, y: 3, w: 4, h: 4, fill: { color: ORANGE, transparency: 80 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 7.5, y: -1, w: 3.5, h: 3.5, fill: { color: NAVY_LIGHT, transparency: 60 } });

  slide.addText("Your next 100 students\nare already looking online.", {
    x: 0.5, y: 0.9, w: 9, h: 1.2, fontSize: 34, bold: true, color: WHITE, align: "center", fontFace: FONT,
  });
  slide.addText("Give them a school worth enrolling in.", {
    x: 0.5, y: 2.15, w: 9, h: 0.5, fontSize: 18, color: ORANGE, align: "center", fontFace: FONT,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 2.2, y: 2.9, w: 5.6, h: 0.85, fill: { color: ORANGE }, rectRadius: 0.2,
    shadow: { type: "outer", blur: 12, offset: 4, angle: 45, color: "000000", opacity: 0.25 },
  });
  slide.addText("Book Your Free Demo Today", {
    x: 2.2, y: 3.02, w: 5.6, h: 0.6, fontSize: 20, bold: true, color: NAVY, align: "center", fontFace: FONT,
  });

  slide.addText("info@xanderglobalscholars.com", {
    x: 0.5, y: 4.0, w: 9, h: 0.35, fontSize: 14, color: WHITE, align: "center", fontFace: FONT,
  });
  slide.addText("xanderglobalacademy.com/meeting-registration", {
    x: 0.5, y: 4.4, w: 9, h: 0.3, fontSize: 11, color: "94A3B8", align: "center", fontFace: FONT,
  });
  slide.addText("Free setup · 2-day training · Go live in 5 days", {
    x: 0.5, y: 4.85, w: 9, h: 0.3, fontSize: 10, bold: true, color: ORANGE, align: "center", fontFace: FONT,
  });
}

// === BUILD FINAL DECK ===
mkdirSync(SCREENSHOT_DIR, { recursive: true });

titleSlide();

sectionSlide(1, "The Problem", "Every day without a real platform, you lose enrollments");
painSlide();

sectionSlide(2, "The Solution", "One platform that runs your entire school");
solutionSlide();
impactStatsSlide();
audienceSlide();

sectionSlide(3, "See It Live", "Real screenshots from xanderglobalacademy.com");

platformScreenshotSlide(
  "Your storefront — built to convert",
  "First impressions win enrollments",
  "Promo banners, featured programs, and bold calls-to-action. Parents and professionals judge credibility in seconds — this looks like a school they can trust.",
  "homepage.png",
  null
);

platformScreenshotSlide(
  "Sell programs 24/7",
  "Revenue while you sleep",
  "Course catalog with clear pricing. Learners browse, compare, and enroll without a phone call. No more \"send me the fees on WhatsApp.\"",
  "courses.png",
  null
);

platformScreenshotSlide(
  "Enrollment in under 2 minutes",
  "Friction kills sales",
  "Branded signup with course and study-shift selection. Confirmation emails fire automatically. Your team approves — student starts learning same day.",
  "signup.png",
  null
);

platformScreenshotSlide(
  "Command center for your team",
  "See everything. Control everything.",
  "Students, revenue, courses, and live classes in one dashboard. No more switching between 5 browser tabs to answer one parent question.",
  "dashboard.png",
  drawDashboardMockup
);

platformScreenshotSlide(
  "Leads book themselves",
  "Never miss a prospect again",
  "Calendly-style meeting booking built in. Prospects pick a slot, you approve, Zoom link sends automatically. Turn website visitors into sales calls.",
  "meeting.png",
  null
);

sectionSlide(4, "Proof It Works", "Schools like yours are already growing");

caseStudySlide(
  "Global Language Academy",
  "IELTS & English · East Africa",
  { value: "180+", label: "Learners in 8 weeks" },
  "Enrollments on WhatsApp. Payments chased manually. Zoom links sent one-by-one — half the class missed sessions.",
  "Launched 6 IELTS courses with Stripe, live scheduling, and branded portal. Live in 5 days.",
  "94% fewer payment follow-ups\n3× live class attendance\nAuto certificates on completion\n$8,200 new revenue in month 1",
  "We went from embarrassing to impressive in one week. Parents finally trust us.",
  "Director, Global Language Academy"
);

caseStudySlide(
  "SkillsBridge Africa",
  "Franchise Network · 4 Countries",
  { value: "4×", label: "Faster partner launch" },
  "Each franchise used different tools. HQ had zero visibility. Corporate clients questioned brand consistency.",
  "Deployed white-label partner portals — each school gets branded URL, scoped admin, central HQ reporting.",
  "4 partners live in 30 days\nCentral revenue dashboard\n2 new corporate contracts signed\n40% faster onboarding",
  "We now sell school-in-a-box. Partners get a portal without hiring developers.",
  "CEO, SkillsBridge Africa"
);

caseStudySlide(
  "TechForward Institute",
  "Corporate IT Training",
  { value: "100%", label: "Certificate verification" },
  "Training via email attachments. No progress tracking. Clients demanded proof of completion — we had none.",
  "Live cohorts, AI quizzes, QR-verified certificates, and automated instructor payouts.",
  "12 corporate batches delivered\nAnnual contract renewed\nQR certificates closed the deal\nInstructor payouts automated",
  "The certificate QR code was the deal-closer. Clients scan and verify instantly.",
  "Head of Training, TechForward Institute"
);

sectionSlide(5, "Investment", "Transparent pricing. No surprises.");

pricingTableSlide();
roiSlide();

trustSlide();
objectionSlide();
demoFlowSlide();
ctaSlide();

const outPath = join(__dirname, "Xander-Learning-Hub-Sales-Pitch-Final.pptx");
await pptx.writeFile({ fileName: outPath });
console.log("Created:", outPath);
console.log("Screenshots:", SCREENSHOT_DIR);
console.log("Refresh screenshots: node capture-screenshots.mjs && node generate-sales-deck.mjs");
