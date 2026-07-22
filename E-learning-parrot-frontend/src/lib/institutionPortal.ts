import type { CSSProperties } from "react";
import type { PlatformInstitutionInfo } from "@/api/axios";

export type InstitutionPortalFeature = {
  title: string;
  description: string;
};

export type InstitutionPortalContent = {
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  about: string;
  primary_color: string | null;
  accent_color?: string | null;
  hero_bg_color?: string | null;
  button_bg_color?: string | null;
  button_text_color?: string | null;
  features: InstitutionPortalFeature[];
  hero_image_url: string | null;
  cta_label: string;
};

export type InstitutionPortalProgram = {
  id: number;
  name: string;
  description?: string | null;
  status?: string;
  courses?: Array<{
    id: number;
    title: string;
    description?: string | null;
    duration?: string | null;
    price?: number | string | null;
  }>;
};

export type InstitutionPortalPayload = {
  institution: PlatformInstitutionInfo & { portal?: InstitutionPortalContent };
  programs: InstitutionPortalProgram[];
  stats: {
    programs_count: number;
    courses_count: number;
  };
};

export type InstitutionPortalTheme = {
  primary: string;
  accent: string;
  heroBg: string;
  buttonBg: string;
  buttonText: string;
  primaryDark: string;
};

export const DEFAULT_PORTAL_PRIMARY = "#38761D";
export const DEFAULT_PORTAL_ACCENT = "#0EA5E9";
export const DEFAULT_PORTAL_BUTTON_TEXT = "#FFFFFF";

export function isValidPortalHex(color: string | null | undefined): boolean {
  return Boolean(color && /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?$/.test(color.trim()));
}

export function normalizePortalHex(color: string | null | undefined, fallback: string): string {
  const trimmed = color?.trim() ?? "";
  if (isValidPortalHex(trimmed)) {
    return trimmed.toUpperCase();
  }
  return fallback.toUpperCase();
}

/** Darken a #RRGGBB color for hover / depth. */
export function darkenHex(hex: string, amount = 0.18): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6);
  if (!/^[0-9A-Fa-f]{6}$/.test(full)) return hex;
  const num = parseInt(full, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

/** Convert #RRGGBB to shadcn HSL channels: "H S% L%" (no hsl() wrapper). */
export function hexToHslChannels(hex: string): string | null {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6);
  if (!/^[0-9A-Fa-f]{6}$/.test(full)) return null;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function resolvePortalPrimary(institution: PlatformInstitutionInfo | null | undefined): string {
  return normalizePortalHex(institution?.portal?.primary_color, DEFAULT_PORTAL_PRIMARY);
}

export function resolvePortalTheme(institution: PlatformInstitutionInfo | null | undefined): InstitutionPortalTheme {
  const portal = institution?.portal;
  const primary = normalizePortalHex(portal?.primary_color, DEFAULT_PORTAL_PRIMARY);
  const accent = normalizePortalHex(portal?.accent_color, DEFAULT_PORTAL_ACCENT);
  const heroBg = normalizePortalHex(portal?.hero_bg_color, primary);
  const buttonBg = normalizePortalHex(portal?.button_bg_color, primary);
  const buttonText = normalizePortalHex(portal?.button_text_color, DEFAULT_PORTAL_BUTTON_TEXT);

  return {
    primary,
    accent,
    heroBg,
    buttonBg,
    buttonText,
    primaryDark: darkenHex(primary),
  };
}

/** Theme style plus optional shadcn --primary override for dashboards. */
export function portalThemeStyle(
  themeOrPrimary: InstitutionPortalTheme | string,
  options?: { overridePrimaryToken?: boolean },
): CSSProperties {
  const theme =
    typeof themeOrPrimary === "string"
      ? {
          primary: themeOrPrimary,
          accent: DEFAULT_PORTAL_ACCENT,
          heroBg: themeOrPrimary,
          buttonBg: themeOrPrimary,
          buttonText: DEFAULT_PORTAL_BUTTON_TEXT,
          primaryDark: darkenHex(themeOrPrimary),
        }
      : themeOrPrimary;

  const style: CSSProperties = {
    ["--institution-primary" as string]: theme.primary,
    ["--institution-primary-dark" as string]: theme.primaryDark,
    ["--institution-accent" as string]: theme.accent,
    ["--institution-hero-bg" as string]: theme.heroBg,
    ["--institution-button-bg" as string]: theme.buttonBg,
    ["--institution-button-text" as string]: theme.buttonText,
  };

  if (options?.overridePrimaryToken) {
    const channels = hexToHslChannels(theme.primary);
    if (channels) {
      style["--primary" as string] = channels;
      const ring = hexToHslChannels(theme.accent);
      if (ring) style["--ring" as string] = ring;
    }
  }

  return style;
}

export type PortalColorDraft = {
  primary_color: string;
  accent_color: string;
  hero_bg_color: string;
  button_bg_color: string;
  button_text_color: string;
};

export function emptyPortalColorDraft(portal?: InstitutionPortalContent | null): PortalColorDraft {
  const primary = normalizePortalHex(portal?.primary_color, DEFAULT_PORTAL_PRIMARY);
  return {
    primary_color: primary,
    accent_color: normalizePortalHex(portal?.accent_color, DEFAULT_PORTAL_ACCENT),
    hero_bg_color: normalizePortalHex(portal?.hero_bg_color, primary),
    button_bg_color: normalizePortalHex(portal?.button_bg_color, primary),
    button_text_color: normalizePortalHex(portal?.button_text_color, DEFAULT_PORTAL_BUTTON_TEXT),
  };
}
