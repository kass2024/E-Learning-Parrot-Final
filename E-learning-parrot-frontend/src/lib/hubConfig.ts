export const HUB = {
  name: "parrotglobalstudyacademy Learning",
  company: "parrotglobalstudyacademy",
  slogan: "Study. Learn. Succeed Globally.",
  tagline: "Language training, exam preparation, and live online classes — all in one place.",
  supportEmail: "infos@parrotglobalstudyacademy.ca",
  supportPhone: "+250 788 797 673",
  supportPhones: ["+250 788 797 673"],
  address: "Parrot Canada Visa Consultant — global online learning",
  mapQuery: "Parrot Canada Visa Consultant",
} as const;

export const EXAM_CATEGORIES = [
  "IELTS Preparation",
  "TOEFL Preparation",
  "Duolingo English Test (DET)",
  "PTE Academic",
  "Cambridge English",
  "SAT / GRE / GMAT",
] as const;

export const LANGUAGE_CATEGORIES = [
  "English (Academic, Business, General)",
  "French (DELF/DALF)",
  "German (Goethe, TestDaF)",
  "Korean (TOPIK)",
  "Chinese (HSK)",
  "Japanese (JLPT)",
  "Spanish & Arabic",
] as const;

export const PLATFORM_USERS = [
  {
    id: 24,
    name: "JEANDEDIEU Hakizimana",
    email: "infos@parrotglobalstudyacademy.ca",
    role: "admin",
    description: "Full platform access — users, courses, payments, Zoom, reports.",
  },
  {
    id: 29,
    name: "Emmanuel Niyonzima",
    email: "emmanuel@parrotglobalstudyacademy.ca",
    role: "staff",
    description: "Operations access — courses, students, classes, meeting schedules.",
  },
  {
    id: 28,
    name: "NDIKUMANA Eric",
    email: "ndikumanaeric001@gmail.com",
    role: "meeting_user",
    description: "Meeting coordinator — review and approve webinar registrations.",
  },
] as const;

export type HubRole =
  | "learner"
  | "instructor"
  | "admin"
  | "staff"
  | "meeting_user"
  | "partner_company";

export function dashboardPathForRole(role: string): string {
  switch (role) {
    case "admin":
    case "staff":
    case "partner_company":
      return "/dashboard/admin";
    case "instructor":
      return "/dashboard/instructor";
    case "meeting_user":
      return "/dashboard/appointments";
    default:
      return "/dashboard/learner";
  }
}
