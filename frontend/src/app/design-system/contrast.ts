/**
 * WCAG 2.x contrast for the live design tokens (showcase only).
 *
 * Token values are read from the document (getComputedStyle on
 * :root), so the table always reflects what is actually shipped.
 * Colors are converted OKLCH -> sRGB, quantized to 8 bits (what a
 * screen renders) and measured with the WCAG relative-luminance
 * formula.
 */

export interface ContrastPair {
  label: string;
  /** CSS custom property names (without the leading --) */
  foreground: string;
  background: string;
  /** 4.5 = normal text, 3 = large text / non-text UI */
  required: 4.5 | 3;
  /** Token scope to read from (defaults to :root) */
  area?: "admin";
  /**
   * How the showcase demonstrates the pair (defaults to "text").
   * Non-text pairs are shown as the UI element they measure, never
   * as text in the foreground color.
   */
  sample?: "text" | "border" | "ring" | "graphic";
}

export const CONTRAST_PAIRS: ContrastPair[] = [
  // Text on surfaces
  { label: "Text on page background", foreground: "foreground", background: "background", required: 4.5 },
  { label: "Text on card", foreground: "foreground", background: "card", required: 4.5 },
  { label: "Text on muted surface", foreground: "foreground", background: "muted", required: 4.5 },
  { label: "Secondary text on page background", foreground: "foreground-secondary", background: "background", required: 4.5 },
  { label: "Muted text on page background", foreground: "muted-foreground", background: "background", required: 4.5 },
  { label: "Muted text on card", foreground: "muted-foreground", background: "card", required: 4.5 },
  { label: "Muted text on muted surface", foreground: "muted-foreground", background: "muted", required: 4.5 },
  { label: "Muted text on secondary surface", foreground: "muted-foreground", background: "secondary", required: 4.5 },
  { label: "Placeholder / subtle text on card", foreground: "subtle-foreground", background: "card", required: 4.5 },
  { label: "Placeholder / subtle text on page background", foreground: "subtle-foreground", background: "background", required: 4.5 },
  { label: "Admin: text on admin background", foreground: "foreground", background: "background", required: 4.5, area: "admin" },
  { label: "Admin: muted text on admin background", foreground: "muted-foreground", background: "background", required: 4.5, area: "admin" },

  // Brand / actions
  { label: "Primary button text", foreground: "primary-foreground", background: "primary", required: 4.5 },
  { label: "Primary hover", foreground: "primary-foreground", background: "color-tea-800", required: 4.5 },
  { label: "Primary pressed", foreground: "primary-foreground", background: "color-tea-900", required: 4.5 },
  { label: "Secondary button text", foreground: "secondary-foreground", background: "secondary", required: 4.5 },
  { label: "Brand link on card", foreground: "color-tea-700", background: "card", required: 4.5 },
  { label: "Brand link on page background", foreground: "color-tea-700", background: "background", required: 4.5 },
  { label: "Accent text on card", foreground: "color-cinnamon-700", background: "card", required: 4.5 },
  { label: "Accent text on page background", foreground: "color-cinnamon-700", background: "background", required: 4.5 },
  { label: "Accent button text", foreground: "color-ink-950", background: "color-cinnamon-400", required: 4.5 },
  { label: "Destructive text on card", foreground: "destructive", background: "card", required: 4.5 },
  { label: "Selected nav item", foreground: "sidebar-accent-foreground", background: "sidebar-accent", required: 4.5 },
  { label: "Idle nav item", foreground: "sidebar-foreground", background: "sidebar", required: 4.5 },

  // Status badges (text on soft background)
  { label: "Badge: neutral", foreground: "color-ink-700", background: "color-ink-50", required: 4.5 },
  { label: "Badge: info", foreground: "color-info-ink", background: "color-info-soft", required: 4.5 },
  { label: "Badge: awaiting", foreground: "color-cinnamon-800", background: "color-cinnamon-50", required: 4.5 },
  { label: "Badge: success", foreground: "color-success-ink", background: "color-success-soft", required: 4.5 },
  { label: "Badge: warning", foreground: "color-warning-ink", background: "color-warning-soft", required: 4.5 },
  { label: "Badge: danger", foreground: "color-danger-ink", background: "color-danger-soft", required: 4.5 },
  { label: "Badge: muted", foreground: "color-sand-700", background: "color-sand-100", required: 4.5 },

  // Solid semantic fills
  { label: "Success solid", foreground: "color-success-foreground", background: "color-success", required: 4.5 },
  { label: "Info solid", foreground: "color-info-foreground", background: "color-info", required: 4.5 },
  { label: "Warning solid (ink text)", foreground: "color-warning-foreground", background: "color-warning", required: 4.5 },
  { label: "Danger solid", foreground: "color-danger-foreground", background: "color-danger", required: 4.5 },

  // Dark surfaces
  { label: "Dark: text on ink-950", foreground: "color-ivory", background: "color-ink-950", required: 4.5 },
  { label: "Dark: muted text on ink-950", foreground: "color-ink-200", background: "color-ink-950", required: 4.5 },
  { label: "Dark: link on ink-950", foreground: "color-tea-300", background: "color-ink-950", required: 4.5 },
  { label: "Dark: accent on ink-950", foreground: "color-cinnamon-300", background: "color-ink-950", required: 4.5 },

  // Non-text UI (3:1)
  { label: "Input border vs card", foreground: "input", background: "card", required: 3, sample: "border" },
  { label: "Input border vs page background", foreground: "input", background: "background", required: 3, sample: "border" },
  { label: "Focus ring vs card", foreground: "ring", background: "card", required: 3, sample: "ring" },
  { label: "Focus ring vs page background", foreground: "ring", background: "background", required: 3, sample: "ring" },
  { label: "Focus ring vs muted surface", foreground: "ring", background: "muted", required: 3, sample: "ring" },
  { label: "Focus ring on dark surfaces", foreground: "color-tea-300", background: "color-ink-950", required: 3, sample: "ring" },
  { label: "Warning icon vs card", foreground: "color-warning-ink", background: "card", required: 3, sample: "graphic" },
  { label: "Success icon vs card", foreground: "color-success", background: "card", required: 3, sample: "graphic" },
  { label: "Info icon vs card", foreground: "color-info", background: "card", required: 3, sample: "graphic" },
  { label: "Danger icon vs card", foreground: "color-danger", background: "card", required: 3, sample: "graphic" },
  { label: "Rating stars vs card", foreground: "color-cinnamon-500", background: "card", required: 3, sample: "graphic" },
  { label: "Chart / decorative tea vs card", foreground: "color-tea-500", background: "card", required: 3, sample: "graphic" },
];

/** Linear-light sRGB channels, each clamped to 0..1. */
export type LinearRgb = [number, number, number];

const NUMBER = "(-?[\\d.]+(?:e-?\\d+)?)";

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/* OKLCH (as authored) -> linear sRGB (Björn Ottosson's matrices). */
function oklchToLinear(L: number, C: number, h: number): LinearRgb {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(clamp) as LinearRgb;
}

/*
 * CIE Lab (D50) -> linear sRGB, per CSS Color 4. The CSS
 * pipeline re-serializes the authored oklch() tokens as lab(),
 * so the browser hands us lab() values.
 */
function labToLinear(L: number, A: number, B: number): LinearRgb {
  const kappa = 24389 / 27;
  const epsilon = 216 / 24389;
  const fy = (L + 16) / 116;
  const fx = fy + A / 500;
  const fz = fy - B / 200;
  const xr = fx ** 3 > epsilon ? fx ** 3 : (116 * fx - 16) / kappa;
  const yr = L > kappa * epsilon ? fy ** 3 : L / kappa;
  const zr = fz ** 3 > epsilon ? fz ** 3 : (116 * fz - 16) / kappa;
  const [x50, y50, z50] = [xr * 0.3457 / 0.3585, yr, zr * (1 - 0.3457 - 0.3585) / 0.3585];

  // Bradford D50 -> D65
  const x = 0.9554734527042182 * x50 - 0.023098536874261423 * y50 + 0.0632593086610217 * z50;
  const y = -0.028369706963208136 * x50 + 1.0099954580058226 * y50 + 0.021041398966943008 * z50;
  const z = 0.012314001688319899 * x50 - 0.020507696433477912 * y50 + 1.3303659366080753 * z50;

  return [
    3.2409699419045226 * x - 1.537383177570094 * y - 0.4986107602930034 * z,
    -0.9692436362808796 * x + 1.8759675015077202 * y + 0.04155505740717559 * z,
    0.05563007969699366 * x - 0.20397695888897652 * y + 1.0569715142428786 * z,
  ].map(clamp) as LinearRgb;
}

const encode = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

/**
 * Parse a computed CSS color: oklch(), lab(), rgb()/rgba() or
 * #hex. Returns linear sRGB, or null when unsupported.
 */
export function parseColor(value: string): LinearRgb | null {
  const text = value.trim().toLowerCase();

  const fn = (name: string) =>
    text.match(new RegExp(`^${name}\\(\\s*${NUMBER}(%?)[\\s,]+${NUMBER}(%?)[\\s,]+${NUMBER}(?:deg)?(%?)\\s*(?:[/,]\\s*[\\d.%]+\\s*)?\\)$`));

  const oklch = fn("oklch");

  if (oklch) {
    return oklchToLinear(Number(oklch[1]) / (oklch[2] ? 100 : 1), Number(oklch[3]), Number(oklch[5]));
  }

  const lab = fn("lab");

  if (lab) {
    return labToLinear(Number(lab[1]), Number(lab[3]), Number(lab[5]));
  }

  const rgb = fn("rgba?");

  if (rgb) {
    return [rgb[1], rgb[3], rgb[5]].map((v) => decode(Number(v) / 255)) as LinearRgb;
  }

  const hex = text.match(/^#([0-9a-f]{6})$/);

  if (hex) {
    return [0, 2, 4].map((i) => decode(parseInt(hex[1].slice(i, i + 2), 16) / 255)) as LinearRgb;
  }

  return null;
}

/** 8-bit sRGB bytes -- what the screen actually renders. */
const toBytes = (rgb: LinearRgb) => rgb.map((v) => Math.round(encode(v) * 255));

export function toHex(rgb: LinearRgb) {
  return "#" + toBytes(rgb).map((v) => v.toString(16).padStart(2, "0")).join("");
}

function luminance(rgb: LinearRgb) {
  const [r, g, b] = toBytes(rgb).map((v) => decode(v / 255));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: LinearRgb, b: LinearRgb) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (hi + 0.05) / (lo + 0.05);
}
