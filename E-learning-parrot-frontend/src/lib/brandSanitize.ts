import { HUB } from "./hubConfig";

const PARROT_COMPANY = "parrotglobalstudyacademy";
const PARROT_HUB = "parrotglobalstudyacademy Learning";

const LEGACY_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /xander\s*global\s*scholars?/gi, replacement: PARROT_COMPANY },
  { pattern: /xander\s*learning\s*hub/gi, replacement: PARROT_HUB },
  { pattern: /xander\s*global\s*academy/gi, replacement: PARROT_COMPANY },
  { pattern: /xander\s*tech(\s*llc)?/gi, replacement: PARROT_COMPANY },
];

/** Replace old Xander branding in any visible UI string. */
export function sanitizeLegacyBrandText(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  let result = text.trim();
  for (const { pattern, replacement } of LEGACY_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

function titleCaseFromEmailLocal(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/[._+-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Person name for navbar/profile — never show legacy org names like "Xander Global Scholars".
 */
export function formatUserDisplayName(
  name: string | null | undefined,
  email?: string | null
): string {
  const trimmed = (name ?? "").trim();

  if (/xander/i.test(trimmed)) {
    const fromEmail = email ? titleCaseFromEmailLocal(email) : "";
    if (fromEmail) return fromEmail;
    return trimmed.replace(/xander\s*global\s*scholars?/gi, PARROT_COMPANY).replace(/xander/gi, "Parrot").trim();
  }

  const sanitized = sanitizeLegacyBrandText(trimmed);
  if (sanitized) return sanitized;

  if (email) {
    const fromEmail = titleCaseFromEmailLocal(email);
    if (fromEmail) return fromEmail;
  }

  return "User";
}

export function normalizeLegacyLoginEmail(email: string | null | undefined): string {
  const trimmed = (email ?? "").trim().toLowerCase();
  if (!trimmed) return "";

  const aliases: Record<string, string> = {
    "info@xanderglobalscholars.com": "infos@parrotglobalstudyacademy.ca",
    "admission@xanderglobalscholars.com": "infos@parrotglobalstudyacademy.ca",
    "info@xanderglobalacademy.com": "infos@parrotglobalstudyacademy.ca",
    "admin@parrot.com": "infos@parrotglobalstudyacademy.ca",
  };

  return aliases[trimmed] ?? trimmed;
}

export function getAppDisplayName(): string {
  const fromEnv = import.meta.env.VITE_APP_NAME?.trim();
  if (fromEnv) return sanitizeLegacyBrandText(fromEnv) || HUB.name;
  return HUB.name;
}
