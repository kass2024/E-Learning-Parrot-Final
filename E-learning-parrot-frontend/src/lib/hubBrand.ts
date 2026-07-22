export type HubBrandColors = {
  primary: string;
  primaryDark: string;
  accent: string;
};

/** Parrot platform brand — green, red, and black accents. */
export function hubBrand(): HubBrandColors {
  return {
    primary: "#38761D",
    primaryDark: "#2A5F17",
    accent: "#E01C21",
  };
}
