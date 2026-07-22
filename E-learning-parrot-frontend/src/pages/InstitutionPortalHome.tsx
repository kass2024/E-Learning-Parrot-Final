import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import InstitutionPortalShell from "@/components/institution-portal/InstitutionPortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/SafeImage";
import { useInstitutionPortal } from "@/hooks/useInstitutionPortal";
import { formatCoursePrice } from "@/lib/apiConfig";
import { DEFAULT_IMAGE } from "@/lib/defaultImages";
import { HUB } from "@/lib/hubConfig";
import {
  EXAM_PROGRAMS,
  HOME_IMAGES,
  HOME_MISSION,
  LANGUAGE_PROGRAMS,
  LANGUAGE_SPEAKING_CLIPS,
  LEARN_PILL_FALLBACK,
  LIVE_FEATURES,
  STUDENT_FEATURES,
  TESTIMONIALS,
} from "@/lib/homeContent";
import { getFeaturedCourseImage } from "@/lib/homeImages";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Quote,
  Search,
  Shield,
  Sparkles,
  Star,
  Users,
  Video,
  VolumeX,
} from "lucide-react";

const BUSUU_GREEN = "#C8F042";
const BUSUU_BLUE = "#4B8BF5";

const InstitutionPortalHome = () => {
  const { slug: routeSlug = "" } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, loading, error, institution } = useInstitutionPortal(routeSlug);
  const portal = institution?.portal;
  const [searchQuery, setSearchQuery] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    if (!institution) return;
    document.title = institution.name;
    return () => {
      document.title = HUB.name;
    };
  }, [institution]);

  useEffect(() => {
    const fromUrl = (searchParams.get("q") || "").trim();
    if (fromUrl) setSearchQuery(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (loading || !data) return;
    const hash = (location.hash || "").replace(/^#/, "").trim().toLowerCase();
    if (!hash) return;
    const t = window.setTimeout(() => {
      if (hash === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [loading, data, location.hash]);

  const allCourses = useMemo(() => {
    const rows: Array<{
      id: number;
      title: string;
      description?: string | null;
      duration?: string | null;
      price?: number | string | null;
      programName: string;
    }> = [];
    for (const program of data?.programs ?? []) {
      for (const course of program.courses ?? []) {
        rows.push({ ...course, programName: program.name });
      }
    }
    return rows;
  }, [data?.programs]);

  const filteredPrograms = useMemo(() => {
    const programs = data?.programs ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((program) => {
      const inName = program.name.toLowerCase().includes(q);
      const inDesc = (program.description || "").toLowerCase().includes(q);
      const inCourses = (program.courses || []).some((c) => c.title.toLowerCase().includes(q));
      return inName || inDesc || inCourses;
    });
  }, [data?.programs, searchQuery]);

  const featuredCourses = useMemo(() => allCourses.slice(0, 6), [allCourses]);

  const learnPills = useMemo(() => {
    if (allCourses.length > 0) {
      return allCourses.slice(0, 14).map((course) => ({
        id: course.id,
        name: course.title,
        subtitle: course.programName,
        query: course.title,
      }));
    }
    // Attractive language fallback — never show "0 courses".
    return LEARN_PILL_FALLBACK.map((item, i) => ({
      id: -(i + 1),
      name: item.name,
      subtitle: item.subtitle,
      query: item.name,
    }));
  }, [allCourses]);

  const carouselItems = useMemo(() => {
    // Busuu-style speaking videos; overlay labels from institution programs when available.
    const programs = data?.programs ?? [];
    return LANGUAGE_SPEAKING_CLIPS.map((clip, i) => {
      const program = programs[i];
      return {
        id: program?.id ?? i,
        label: program?.name ?? clip.title,
        count: program && (program.courses?.length ?? 0) > 0
          ? `${program.courses.length} course${program.courses!.length === 1 ? "" : "s"}`
          : clip.subtitle,
        poster: clip.poster,
        video: clip.video,
      };
    });
  }, [data?.programs]);

  useEffect(() => {
    if (carouselItems.length < 2) return;
    const timer = window.setInterval(() => {
      setCarouselIndex((i) => (i + 1) % carouselItems.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [carouselItems.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-9 w-9 animate-spin text-[var(--institution-primary,#4B8BF5)]" />
      </div>
    );
  }

  if (error || !institution || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h1 className="text-xl font-bold text-slate-800">Website unavailable</h1>
        <p className="mt-2 max-w-md text-slate-600">{error ?? "This institution link is not valid."}</p>
      </div>
    );
  }

  const slug = institution.slug;
  const joinUrl = `/join/${slug}`;
  const teachUrl = `/join/${slug}?role=instructor`;
  const loginUrl = `/login/${slug}`;
  const meetingUrl = `/i/${slug}/meeting-registration`;
  const features = (portal?.features ?? []).filter((f) => f.title.trim() || f.description.trim());
  const websiteHref = institution.website
    ? institution.website.startsWith("http")
      ? institution.website
      : `https://${institution.website}`
    : null;

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    document.getElementById("programs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const displayFeatures =
    features.length > 0
      ? features.map((f, i) => ({
          title: f.title,
          description: f.description,
          icon: [Sparkles, Video, CheckCircle2][i % 3],
        }))
      : [
          {
            title: "Real people",
            description: `Learn authentic skills for real-world situations with ${institution.name}.`,
            icon: Sparkles,
          },
          {
            title: "Supportive community",
            description: "Learn together in live classes and get feedback from instructors.",
            icon: Users,
          },
          {
            title: "Express yourself",
            description: "Build grammar, exam skills, and confidence in expertly designed programs.",
            icon: BookOpen,
          },
        ];

  const visibleCarousel = [
    carouselItems[(carouselIndex - 1 + carouselItems.length) % carouselItems.length],
    carouselItems[carouselIndex % carouselItems.length],
    carouselItems[(carouselIndex + 1) % carouselItems.length],
    carouselItems[(carouselIndex + 2) % carouselItems.length],
    carouselItems[(carouselIndex + 3) % carouselItems.length],
  ];

  return (
    <InstitutionPortalShell institution={institution} activeSection="home">
      {/* I want to learn — Busuu pills */}
      <section className="bg-white py-14 sm:py-16">
        <div className="container mx-auto max-w-5xl px-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            I want to learn:
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {allCourses.length > 0
              ? `Courses published by ${institution.name}`
              : `Explore what you can learn with ${institution.name}`}
          </p>

          <div className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3">
            {learnPills.map((pill) => {
              const active = searchQuery.trim().toLowerCase() === pill.query.toLowerCase();
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery(pill.query);
                    document.getElementById("programs")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "flex min-w-[140px] items-center gap-3 rounded-full border px-4 py-2.5 text-left transition",
                    active
                      ? "border-[var(--institution-primary,#4B8BF5)] bg-[var(--institution-primary,#4B8BF5)]/10 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white"
                    style={{ background: "var(--institution-button-bg, var(--institution-primary, #4B8BF5))" }}
                  >
                    {pill.name.charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <span className="block text-sm font-extrabold text-slate-900">{pill.name}</span>
                    <span className="block text-xs text-slate-500">{pill.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Subject, exam, or course..."
                className="h-12 rounded-full border-slate-200 bg-slate-50 pl-10"
              />
            </div>
            <Button
              type="submit"
              className="h-12 rounded-full px-6 font-extrabold text-white"
              style={{ background: "var(--institution-button-bg, var(--institution-primary, #4B8BF5))" }}
            >
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-slate-100 bg-[#F7F8FA] py-5">
        <div className="container mx-auto grid max-w-5xl grid-cols-1 gap-3 px-4 sm:grid-cols-3">
          {[
            { icon: Headphones, label: "24/7 Online Support" },
            { icon: Shield, label: "Secure Stripe Payments" },
            { icon: Award, label: "Fully Accredited Programs" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
            >
              <item.icon className="h-4 w-4 text-[var(--institution-primary,#4B8BF5)]" />
              {item.label}
            </div>
          ))}
        </div>
      </section>

      {/* Stats — Busuu cards */}
      <section className="bg-white py-12 sm:py-14">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                value: `${data.stats.programs_count}+`,
                label: "published programs at this institution",
                icon: <Sparkles className="h-5 w-5 text-emerald-500" />,
              },
              {
                value: `${data.stats.courses_count}+`,
                label: "courses available for enrollment",
                icon: <Video className="h-5 w-5 text-[var(--institution-primary,#4B8BF5)]" />,
              },
              {
                value: "Live",
                label: "online classes with expert instructors",
                icon: <Star className="h-5 w-5 text-[#E01C21]" />,
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[1.75rem] bg-[#F4F5F7] px-6 py-8">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    {stat.value}
                  </p>
                  {stat.icon}
                </div>
                <p className="mt-3 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real-world skills carousel */}
      <section className="bg-white pb-14">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="overflow-hidden rounded-[2rem] bg-[#F4F5F7] px-4 py-12 sm:px-8 sm:py-14">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Learn real-world skills
              </h2>
              <p className="mt-3 text-slate-600">
                See programs and courses from {institution.name} and build confidence for study, work, and exams.
              </p>
            </div>

            <div className="relative mt-10">
              <button
                type="button"
                className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md"
                onClick={() =>
                  setCarouselIndex((i) => (i - 1 + carouselItems.length) % carouselItems.length)
                }
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md"
                onClick={() => setCarouselIndex((i) => (i + 1) % carouselItems.length)}
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="mx-auto flex max-w-5xl items-end justify-center gap-3 overflow-hidden px-12">
                {visibleCarousel.map((item, idx) => {
                  const center = idx === 2;
                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className={cn(
                        "relative overflow-hidden rounded-[1.5rem] transition-all duration-300",
                        center ? "h-72 w-44 sm:h-80 sm:w-52" : "h-56 w-32 opacity-80 sm:h-64 sm:w-40",
                        (idx === 0 || idx === 4) && "hidden opacity-40 sm:block",
                      )}
                    >
                      <video
                        key={item.video}
                        className="absolute inset-0 h-full w-full object-cover"
                        src={item.video}
                        poster={item.poster}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-md">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--institution-primary,#4B8BF5)] text-[10px] font-bold text-white">
                          {item.label.charAt(0)}
                        </span>
                        <span>
                          <span className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-900">
                            {item.label}
                          </span>
                          <span className="block text-[10px] text-slate-500">{item.count}</span>
                        </span>
                      </div>
                      <div className="absolute bottom-16 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700">
                        <VolumeX className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-10 text-center">
              <Button
                asChild
                size="lg"
                className="rounded-full px-10 font-extrabold text-white shadow-lg"
                style={{ background: "var(--institution-button-bg, var(--institution-primary, #4B8BF5))" }}
              >
                <NavLink to={joinUrl}>Learn for free</NavLink>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-[2rem] shadow-lg aspect-[4/3]">
              <SafeImage
                src={HOME_IMAGES.marketplace}
                fallback={DEFAULT_IMAGE}
                alt="Learning community"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--institution-primary,#4B8BF5)]">Our mission</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
                Learn anytime, anywhere with {institution.name}
              </h2>
              <p className="mt-4 text-slate-600">{portal?.about || HOME_MISSION.mission}</p>
              <ul className="mt-6 space-y-3">
                {[
                  "Language training for study, work, and travel",
                  "International exam preparation",
                  "Live online classes with approved instructors",
                  "Secure enrollment and Stripe payments",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--institution-primary,#4B8BF5)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                className="mt-8 rounded-full px-8 font-bold text-white"
                style={{ background: "var(--institution-button-bg, var(--institution-primary, #4B8BF5))" }}
                onClick={() =>
                  document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Learn about us
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="scroll-mt-[var(--institution-header-height,4.5rem)] bg-[#F7F8FA] py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--institution-primary,#4B8BF5)]">Our courses</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Find the best programs for you
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Only programs published by {institution.name} appear here.
            </p>
          </div>

          {filteredPrograms.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-500">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              {searchQuery.trim()
                ? `No programs match “${searchQuery.trim()}”.`
                : `Programs will appear here once published by ${institution.name}.`}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPrograms.map((program, index) => (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-extrabold text-slate-900">{program.name}</h3>
                    <span className="rounded-full bg-[var(--institution-primary,#4B8BF5)]/10 px-2.5 py-1 text-[11px] font-bold text-[#2F6FE0]">
                      {program.courses?.length ?? 0} courses
                    </span>
                  </div>
                  {program.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{program.description}</p>
                  )}
                  <Button
                    asChild
                    size="sm"
                    className="mt-5 rounded-full font-extrabold text-[#1A2E05]"
                    style={{ background: BUSUU_GREEN }}
                  >
                    <NavLink to={joinUrl}>
                      Enroll
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </NavLink>
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured courses */}
      {featuredCourses.length > 0 && (
        <section className="bg-white py-14 sm:py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-10 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--institution-primary,#4B8BF5)]">Featured</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Popular courses at {institution.name}</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCourses.map((course, index) => (
                <div
                  key={course.id}
                  className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <SafeImage
                      src={getFeaturedCourseImage(index, course.title, null)}
                      fallback={DEFAULT_IMAGE}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-2 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-[#C8F042] text-[#C8F042]" />
                      ))}
                    </div>
                    <h3 className="mb-1 font-bold text-slate-900">{course.title}</h3>
                    <p className="mb-3 text-xs text-slate-500">{course.programName}</p>
                    <p className="mb-4 mt-auto text-sm font-bold text-slate-900">
                      {formatCoursePrice(course.price)}
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="rounded-full font-extrabold text-[#1A2E05]"
                      style={{ background: BUSUU_GREEN }}
                    >
                      <NavLink to={joinUrl}>Enroll Now</NavLink>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Exam prep */}
      <section className="bg-[#F7F8FA] py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--institution-primary,#4B8BF5)]">International exams</p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Prepare for global admissions</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {EXAM_PROGRAMS.map((program) => (
              <button
                key={program.title}
                type="button"
                className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => navigate(joinUrl)}
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <SafeImage
                    src={program.image}
                    fallback={DEFAULT_IMAGE}
                    alt={program.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-900">{program.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{program.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Languages */}
      <section className="bg-white py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--institution-primary,#4B8BF5)]">Language courses</p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Master a new language</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LANGUAGE_PROGRAMS.map((lang) => (
              <button
                key={lang.title}
                type="button"
                className="group relative h-56 overflow-hidden rounded-[1.5rem] shadow-md"
                onClick={() => navigate(joinUrl)}
              >
                <SafeImage
                  src={lang.image}
                  fallback={DEFAULT_IMAGE}
                  alt={lang.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <h3 className="text-lg font-bold">{lang.title}</h3>
                  <p className="text-sm text-white/80">{lang.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* What makes different */}
      <section className="bg-[#F7F8FA] py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              What makes {institution.name} different?
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {displayFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={`${feature.title}-${index}`} className="rounded-[1.75rem] bg-white p-6 shadow-sm">
                  <div
                    className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                    style={{ background: "var(--institution-button-bg, var(--institution-primary, #4B8BF5))" }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Student features */}
      <section className="bg-white py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--institution-primary,#4B8BF5)]">Student portal</p>
            <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Everything you need to succeed</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STUDENT_FEATURES.map((feature) => (
              <div key={feature.title} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                <div className="h-32 overflow-hidden">
                  <SafeImage
                    src={feature.image}
                    fallback={DEFAULT_IMAGE}
                    alt={feature.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live learning */}
      <section className="bg-white py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div
            className="overflow-hidden rounded-[2rem] px-6 py-10 text-white sm:px-10 sm:py-12 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10"
            style={{ background: `linear-gradient(135deg, ${BUSUU_BLUE}, #2F6FE0)` }}
          >
            <div className="relative mb-8 overflow-hidden rounded-[1.5rem] lg:mb-0 lg:order-1">
              <SafeImage
                src={HOME_IMAGES.liveClass}
                fallback={DEFAULT_IMAGE}
                alt="Live online class"
                className="aspect-[4/3] w-full object-cover"
              />
              <Badge className="absolute left-4 top-4 gap-1 border-0 bg-red-500 text-white hover:bg-red-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                Live
              </Badge>
            </div>
            <div className="lg:order-2">
              <p className="text-sm font-bold uppercase tracking-wider text-white/80">Live learning</p>
              <h2 className="mt-2 text-3xl font-extrabold">Interactive online classes</h2>
              <p className="mt-3 text-white/85">
                Join real-time sessions with instructors at {institution.name}, ask questions, and access lessons afterward.
              </p>
              <ul className="mt-5 space-y-2">
                {LIVE_FEATURES.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white/90">
                    <Video className="h-4 w-4 text-[#C8F042]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  asChild
                  className="rounded-full font-extrabold text-[#1A2E05]"
                  style={{ background: BUSUU_GREEN }}
                >
                  <NavLink to={meetingUrl}>Book meeting with us</NavLink>
                </Button>
                <Button asChild className="rounded-full bg-white/15 font-semibold text-white hover:bg-white/25">
                  <NavLink to={joinUrl}>Get Started</NavLink>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#F7F8FA] py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Why learners love {institution.name}
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name} className="rounded-[1.75rem] bg-white p-6 shadow-sm">
                <Quote className="mb-3 h-5 w-5 text-[var(--institution-primary,#4B8BF5)]" />
                <p className="text-sm leading-relaxed text-slate-700">“{t.text}”</p>
                <footer className="mt-4 flex items-center gap-3">
                  <SafeImage
                    src={t.image}
                    fallback={DEFAULT_IMAGE}
                    alt={t.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{t.name}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.role}</p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Instructor CTA — same layout as main platform */}
      <section className="bg-white py-16 md:py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg lg:grid-cols-2">
            <div className="flex flex-col justify-center p-8 md:p-10">
              <Badge className="mb-4 w-fit border-[#E01C21]/30 bg-[#E01C21]/15 text-[#0A0A0A]">
                For instructors
              </Badge>
              <h2 className="mb-4 text-2xl font-bold text-[#38761D] md:text-3xl">
                Teach on our marketplace
              </h2>
              <p className="mb-6 leading-relaxed text-slate-600">
                Approved instructors create courses, host live classes, manage students, and earn from every
                enrollment — while {institution.name} handles platform support and payments for this institution.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-md bg-[#38761D] px-6 text-white hover:bg-[#2A5F17]">
                  <NavLink to={teachUrl}>
                    Apply as instructor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </NavLink>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-md border-[#38761D] text-[#38761D] hover:bg-[#38761D]/5"
                >
                  <NavLink to={loginUrl}>Instructor login</NavLink>
                </Button>
              </div>
            </div>
            <div className="relative min-h-[260px] lg:min-h-[300px]">
              <SafeImage
                src={HOME_IMAGES.certificate}
                fallback={DEFAULT_IMAGE}
                alt="Teaching and certification"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-[var(--institution-header-height,4.5rem)] bg-[#F7F8FA] py-14 sm:py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--institution-primary,#4B8BF5)]">About us</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">{institution.name}</h2>
              <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-slate-600">
                {portal?.about}
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-white p-6 shadow-sm">
              <p className="text-sm font-extrabold text-slate-900">At a glance</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                <li>
                  <span className="font-semibold">Programs:</span> {data.stats.programs_count}
                </li>
                <li>
                  <span className="font-semibold">Courses:</span> {data.stats.courses_count}
                </li>
                {institution.address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-[var(--institution-primary,#4B8BF5)]" />
                    {institution.address}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA / contact */}
      <section
        id="contact"
        className="scroll-mt-[var(--institution-header-height,4.5rem)] py-16 text-white sm:py-20"
        style={{ background: `linear-gradient(135deg, ${BUSUU_BLUE}, #1E5AD4)` }}
      >
        <div className="container mx-auto max-w-6xl px-4 text-center">
          <BookOpen className="mx-auto mb-5 h-10 w-10 text-[#C8F042]" />
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            Ready to study with {institution.name}?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Get started as a student at {institution.name}, or apply as an instructor for this institution.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-md bg-white px-8 font-semibold text-[#38761D] hover:bg-white/90"
            >
              <NavLink to={joinUrl}>Get Started</NavLink>
            </Button>
            <Button
              asChild
              size="lg"
              className="rounded-md bg-[#E01C21] px-8 font-semibold text-white hover:bg-[#B8181C]"
            >
              <NavLink to={teachUrl}>Apply as instructor</NavLink>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-md border-white/40 bg-transparent px-8 font-semibold text-white hover:bg-white/10"
            >
              <NavLink to={loginUrl}>Log In</NavLink>
            </Button>
          </div>
          {(institution.contact_email || institution.contact_phone) && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-white/85">
              {institution.contact_email && (
                <a href={`mailto:${institution.contact_email}`} className="inline-flex items-center gap-2 hover:underline">
                  <Mail className="h-4 w-4" />
                  {institution.contact_email}
                </a>
              )}
              {institution.contact_phone && (
                <a href={`tel:${institution.contact_phone}`} className="inline-flex items-center gap-2 hover:underline">
                  <Phone className="h-4 w-4" />
                  {institution.contact_phone}
                </a>
              )}
            </div>
          )}
          {websiteHref && (
            <p className="mt-3 text-sm text-white/70">
              <a href={websiteHref} target="_blank" rel="noreferrer" className="hover:underline">
                {institution.website?.replace(/^https?:\/\//, "")}
              </a>
            </p>
          )}
        </div>
      </section>
    </InstitutionPortalShell>
  );
};

export default InstitutionPortalHome;
