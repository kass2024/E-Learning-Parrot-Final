import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlatformInstitutionInfo } from "@/api/axios";
import { resolveInstitutionLogoUrl } from "@/lib/institutionContext";
import { portalThemeStyle, resolvePortalTheme } from "@/lib/institutionPortal";
import { HOME_IMAGES } from "@/lib/homeContent";
import { DEFAULT_IMAGE } from "@/lib/defaultImages";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Globe,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  Star,
  X,
} from "lucide-react";

export type PortalNavSection =
  | "home"
  | "programs"
  | "about"
  | "contact"
  | "meeting"
  | "teach"
  | "join"
  | "login";

const SECTION_IDS: Array<"home" | "programs" | "about" | "contact"> = [
  "home",
  "programs",
  "about",
  "contact",
];

/** Busuu visual tokens — design only; content stays institution-scoped. */
const BUSUU = {
  blue: "#4B8BF5",
  blueDeep: "#2F6FE0",
  blueDark: "#1E5AD4",
  green: "#C8F042",
  greenText: "#1A2E05",
  ink: "#111827",
  mute: "#6B7280",
  soft: "#F4F5F7",
} as const;

type Props = {
  institution: PlatformInstitutionInfo;
  activeSection?: PortalNavSection;
  children: React.ReactNode;
  className?: string;
  compactHero?: boolean;
};

function portalHomePath(slug: string): string {
  return `/i/${encodeURIComponent(slug)}`;
}

function scrollToSection(sectionId: string, behavior: ScrollBehavior = "smooth") {
  if (sectionId === "home") {
    window.scrollTo({ top: 0, behavior });
    return;
  }
  document.getElementById(sectionId)?.scrollIntoView({ behavior, block: "start" });
}

const InstitutionPortalShell = ({
  institution,
  activeSection = "home",
  children,
  className,
  compactHero = false,
}: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hashSection, setHashSection] = useState<PortalNavSection | null>(null);
  const [headerSearch, setHeaderSearch] = useState("");

  const slug = institution.slug?.trim().toLowerCase() || "";
  const logo = resolveInstitutionLogoUrl(institution);
  const theme = resolvePortalTheme(institution);
  const portal = institution.portal;
  const homePath = slug ? portalHomePath(slug) : "/";
  const joinUrl = slug ? `/join/${slug}` : "/signup";
  const teachUrl = slug ? `/join/${slug}?role=instructor` : "/signup?role=instructor";
  const loginUrl = slug ? `/login/${slug}` : "/login";
  const meetingUrl = slug ? `/i/${slug}/meeting-registration` : "/meeting-registration";
  const onPortalHome = location.pathname.replace(/\/$/, "") === homePath;
  const onMeetingPage = location.pathname.replace(/\/$/, "") === meetingUrl.replace(/\/$/, "");
  const showBusuuHero = !compactHero && onPortalHome && Boolean(portal);

  useEffect(() => {
    const id = "institution-portal-font";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--institution-header-height",
        `${header.offsetHeight}px`,
      );
    };

    syncHeaderHeight();
    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(header);
    window.addEventListener("resize", syncHeaderHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeaderHeight);
    };
  }, [mobileOpen]);

  const navItems = useMemo(
    () =>
      [
        { id: "home" as const, label: "Home", kind: "section" as const, hash: "" },
        { id: "programs" as const, label: "Programs", kind: "section" as const, hash: "programs" },
        { id: "about" as const, label: "About", kind: "section" as const, hash: "about" },
        { id: "meeting" as const, label: "Book meeting with us", kind: "route" as const, to: meetingUrl },
      ] as const,
    [meetingUrl],
  );

  const goToSection = useCallback(
    (section: PortalNavSection, hash: string) => {
      setMobileOpen(false);
      setHashSection(section);
      if (!onPortalHome) {
        navigate(hash ? `${homePath}#${hash}` : homePath);
        return;
      }
      if (hash) {
        window.history.replaceState(null, "", `${homePath}#${hash}`);
        scrollToSection(hash, "smooth");
      } else {
        window.history.replaceState(null, "", homePath);
        scrollToSection("home", "smooth");
      }
    },
    [homePath, navigate, onPortalHome],
  );

  const handleHeaderSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = headerSearch.trim();
    setMobileOpen(false);
    const target = q ? `${homePath}?q=${encodeURIComponent(q)}#programs` : `${homePath}#programs`;
    if (onPortalHome) {
      navigate(target, { replace: true });
      window.setTimeout(() => scrollToSection("programs", "smooth"), 60);
      return;
    }
    navigate(target);
  };

  useEffect(() => {
    if (!onPortalHome) return;
    const raw = (location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (!raw || !SECTION_IDS.includes(raw as (typeof SECTION_IDS)[number])) {
      if (!location.hash) setHashSection("home");
      return;
    }
    setHashSection(raw as PortalNavSection);
    const t = window.setTimeout(() => scrollToSection(raw, "smooth"), 80);
    return () => window.clearTimeout(t);
  }, [onPortalHome, location.hash, location.pathname]);

  useEffect(() => {
    if (!onPortalHome || compactHero) return;
    const observers: IntersectionObserver[] = [];
    const ratios = new Map<string, number>();
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
          let best: PortalNavSection = "home";
          let bestRatio = 0;
          ratios.forEach((ratio, key) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              best = key as PortalNavSection;
            }
          });
          if (bestRatio > 0.15) setHashSection(best);
        },
        { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.2, 0.4, 0.6] },
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [onPortalHome, compactHero, institution.id]);

  const currentSection: PortalNavSection = onMeetingPage
    ? "meeting"
    : hashSection ?? activeSection;

  const linkClass = (section: PortalNavSection) =>
    cn(
      "whitespace-nowrap text-sm font-medium transition-colors text-slate-600 hover:text-[var(--institution-primary,#38761D)]",
      currentSection === section && "text-[var(--institution-primary,#38761D)] font-semibold",
    );

  const heroTitle = portal?.hero_title?.trim() || `Learn with ${institution.name}`;
  const highlightWord =
    heroTitle.split(/\s+/).find((w) => w.length > 4) || institution.name.split(/\s+/)[0] || "learn";
  const titleParts = heroTitle.includes(highlightWord)
    ? (() => {
        const idx = heroTitle.indexOf(highlightWord);
        return {
          before: heroTitle.slice(0, idx),
          mid: highlightWord,
          after: heroTitle.slice(idx + highlightWord.length),
        };
      })()
    : { before: "", mid: heroTitle, after: "" };

  return (
    <div
      className={cn(
        "institution-portal min-h-screen flex flex-col bg-white text-slate-900",
        "font-[Manrope,ui-sans-serif,system-ui,sans-serif]",
        className,
      )}
      style={{
        ...portalThemeStyle(theme),
        ["--busuu-blue" as string]: BUSUU.blue,
        ["--busuu-green" as string]: BUSUU.green,
      }}
    >
      {/* Fixed like hub Navbar so it stays put while the page scrolls */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-[100] border-b border-slate-200 bg-white shadow-md"
      >
        <div className="container mx-auto px-4">
          <div className="relative flex h-16 items-center justify-between gap-3 md:h-[72px]">
            <button
              type="button"
              className="flex min-w-0 shrink-0 items-center gap-2.5 text-left text-[var(--institution-primary,#38761D)] hover:opacity-90"
              onClick={() => goToSection("home", "")}
            >
              {logo ? (
                <img
                  src={logo}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover shadow-sm md:h-11 md:w-11"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-[var(--institution-button-bg,var(--institution-primary,#38761D))] text-sm font-bold text-white shadow-sm md:h-11 md:w-11">
                  {institution.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
                <span className="truncate text-sm font-bold text-[var(--institution-primary,#38761D)] md:text-base">
                  {institution.name}
                </span>
                <span className="truncate text-[10px] font-medium text-[#E01C21] md:text-xs max-w-[220px]">
                  {portal?.tagline || "Study. Learn. Succeed."}
                </span>
              </div>
            </button>

            <form onSubmit={handleHeaderSearch} className="mx-4 hidden max-w-md flex-1 lg:flex">
              <div className="relative flex-1">
                <Input
                  type="search"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  placeholder="Search courses, exams, languages…"
                  className="h-10 rounded-md border-slate-200 bg-white pr-10 focus-visible:border-[var(--institution-primary,#38761D)] focus-visible:ring-[var(--institution-primary,#38761D)]/20"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--institution-primary,#38761D)] hover:text-[#E01C21]"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>

            <nav className="hidden items-center gap-6 lg:flex" aria-label="Institution website">
              {navItems.map((item) =>
                item.kind === "route" ? (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    className={linkClass(item.id)}
                    activeClassName="text-[var(--institution-primary,#38761D)] font-semibold"
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    className={linkClass(item.id)}
                    onClick={() => goToSection(item.id, item.hash)}
                  >
                    {item.label}
                  </button>
                ),
              )}
            </nav>

            <div className="hidden shrink-0 items-center gap-2 md:flex">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-10 rounded-md border-[var(--institution-primary,#38761D)] bg-white px-5 font-semibold text-[var(--institution-primary,#38761D)] hover:bg-[var(--institution-primary,#38761D)]/5"
              >
                <NavLink to={loginUrl}>Log In</NavLink>
              </Button>
              <Button
                asChild
                size="sm"
                className="h-10 rounded-md bg-[var(--institution-button-bg,var(--institution-primary,#38761D))] px-5 font-semibold text-white hover:bg-[var(--institution-primary-dark,#2A5F17)]"
              >
                <NavLink to={joinUrl}>Get Started</NavLink>
              </Button>
            </div>

            <button
              type="button"
              className="p-1 text-[var(--institution-primary,#38761D)] lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
            <form onSubmit={handleHeaderSearch} className="mb-4">
              <div className="relative">
                <Input
                  type="search"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  placeholder="Search courses, exams, languages…"
                  className="h-11 rounded-md border-slate-200 pr-10"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--institution-primary,#38761D)]"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
            <nav className="flex flex-col gap-1" aria-label="Institution website mobile">
              {navItems.map((item) =>
                item.kind === "route" ? (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    className="rounded-md px-2 py-2.5 font-medium text-slate-700 hover:bg-slate-50 hover:text-[var(--institution-primary,#38761D)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    className="rounded-md px-2 py-2.5 text-left font-medium text-slate-700 hover:bg-slate-50 hover:text-[var(--institution-primary,#38761D)]"
                    onClick={() => goToSection(item.id, item.hash)}
                  >
                    {item.label}
                  </button>
                ),
              )}
              <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3 md:hidden">
                <Button asChild variant="outline" className="w-full rounded-md border-[var(--institution-primary,#38761D)] text-[var(--institution-primary,#38761D)]">
                  <NavLink to={loginUrl} onClick={() => setMobileOpen(false)}>
                    Log In
                  </NavLink>
                </Button>
                <Button asChild className="w-full rounded-md bg-[var(--institution-button-bg,var(--institution-primary,#38761D))] text-white hover:bg-[var(--institution-primary-dark,#2A5F17)]">
                  <NavLink to={joinUrl} onClick={() => setMobileOpen(false)}>
                    Get Started
                  </NavLink>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>
      <div
        aria-hidden
        className="shrink-0"
        style={{ height: "var(--institution-header-height, 4.5rem)" }}
      />

      {showBusuuHero && portal && (
        <section
          id="home"
          className="relative scroll-mt-[var(--institution-header-height,4.5rem)] overflow-hidden text-white"
          style={{
            background: `linear-gradient(160deg, ${theme.primary} 0%, ${theme.primaryDark} 55%, ${theme.heroBg} 100%)`,
          }}
        >
          <div
            className="pointer-events-none absolute -bottom-24 -right-16 h-[420px] w-[520px] rounded-[45%] opacity-40"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)" }}
          />
          <div className="container relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20 lg:pt-14">
            <div>
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-[3.4rem]">
                {titleParts.before}
                <span
                  className="mx-1 inline-block rounded-xl px-2.5 py-0.5 align-baseline"
                  style={{ background: theme.primaryDark }}
                >
                  {titleParts.mid}
                </span>
                {titleParts.after}
              </h1>
              <p className="mt-5 max-w-lg text-base text-white/90 sm:text-lg">
                {portal.hero_subtitle ||
                  "Programs, live online classes, and expert-led training — built for real progress."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full px-8 text-base font-extrabold shadow-lg hover:opacity-95"
                  style={{
                    background: theme.buttonBg === theme.primary ? BUSUU.green : theme.buttonBg,
                    color: theme.buttonBg === theme.primary ? BUSUU.greenText : theme.buttonText,
                  }}
                >
                  <NavLink to={joinUrl}>
                    {portal.cta_label || "Learn for free"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </NavLink>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-[#1F2937] px-7 text-base font-bold text-white hover:bg-black"
                >
                  <NavLink to={meetingUrl}>Book meeting with us</NavLink>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-white/90">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-[#C8F042] text-[#C8F042]" />
                  ))}
                </div>
                <span className="font-semibold">Great</span>
                <span className="text-white/70">· Trusted by learners at {institution.name}</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/75">
                <button type="button" className="hover:text-white" onClick={() => goToSection("programs", "programs")}>
                  All Programs
                </button>
                <span className="text-white/40">|</span>
                <NavLink to={meetingUrl} className="hover:text-white">
                  Book meeting with us
                </NavLink>
                <span className="text-white/40">|</span>
                <button type="button" className="hover:text-white" onClick={() => goToSection("about", "about")}>
                  About Us
                </button>
                <span className="text-white/40">|</span>
                <NavLink to={joinUrl} className="hover:text-white">
                  Get Started
                </NavLink>
              </div>
            </div>

            <div className="relative mx-auto hidden h-[420px] w-full max-w-md lg:block">
              <div className="absolute left-0 top-10 w-[42%] -rotate-6 overflow-hidden rounded-[1.75rem] border-4 border-white/80 bg-white shadow-2xl">
                <SafeImage
                  src={HOME_IMAGES.heroSecondary}
                  fallback={DEFAULT_IMAGE}
                  alt=""
                  className="aspect-[9/16] w-full object-cover"
                />
              </div>
              <div className="absolute left-1/2 top-0 z-10 w-[52%] -translate-x-1/2 overflow-hidden rounded-[1.85rem] border-4 border-white bg-white shadow-2xl">
                <SafeImage
                  src={portal.hero_image_url || HOME_IMAGES.heroMain}
                  fallback={DEFAULT_IMAGE}
                  alt=""
                  className="aspect-[9/16] w-full object-cover"
                />
                <div className="absolute bottom-4 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-[#4B8BF5] text-white shadow-lg">
                  <MessageCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="absolute bottom-6 right-0 w-[40%] rotate-6 overflow-hidden rounded-[1.75rem] border-4 border-white/80 bg-white shadow-2xl">
                <SafeImage
                  src={HOME_IMAGES.liveClass}
                  fallback={DEFAULT_IMAGE}
                  alt=""
                  className="aspect-[9/16] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-[#F7F8FA]">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">{institution.name}</h3>
              {portal?.tagline && <p className="mt-2 text-sm text-slate-600">{portal.tagline}</p>}
              <p className="mt-3 max-w-sm text-sm text-slate-500">
                Student enrollment and instructor applications for {institution.name} only.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild size="sm" className="rounded-md bg-[var(--institution-button-bg,var(--institution-primary,#38761D))] font-semibold text-white hover:bg-[var(--institution-primary-dark,#2A5F17)]">
                  <NavLink to={joinUrl}>Get Started</NavLink>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-md border-[var(--institution-primary,#38761D)] font-semibold text-[var(--institution-primary,#38761D)]">
                  <NavLink to={teachUrl}>Apply as instructor</NavLink>
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Explore</p>
              <ul className="mt-3 space-y-2 text-sm">
                {navItems.map((item) => (
                  <li key={item.id}>
                    {item.kind === "route" ? (
                      <NavLink to={item.to} className="font-medium text-slate-700 hover:text-[#2F6FE0]">
                        {item.label}
                      </NavLink>
                    ) : (
                      <button
                        type="button"
                        className="font-medium text-slate-700 hover:text-[#2F6FE0]"
                        onClick={() => goToSection(item.id, item.hash)}
                      >
                        {item.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact</p>
              {institution.contact_email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-[#4B8BF5]" />
                  <a href={`mailto:${institution.contact_email}`} className="hover:underline">
                    {institution.contact_email}
                  </a>
                </p>
              )}
              {institution.contact_phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-[#4B8BF5]" />
                  <a href={`tel:${institution.contact_phone}`} className="hover:underline">
                    {institution.contact_phone}
                  </a>
                </p>
              )}
              {institution.address && (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#4B8BF5]" />
                  {institution.address}
                </p>
              )}
              {institution.website && (
                <p className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-[#4B8BF5]" />
                  <a
                    href={
                      institution.website.startsWith("http")
                        ? institution.website
                        : `https://${institution.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {institution.website.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              )}
            </div>
          </div>
          <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} {institution.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InstitutionPortalShell;
