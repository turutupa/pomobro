/**
 * Deterministic avatar generator for voice personas.
 * Given a voice name, produces a unique, cute face SVG data URI.
 * Zero dependencies — uses a simple hash to pick features.
 */

// Cute persona names mapped from voice characteristics
const CUTE_NAMES: Record<string, string> = {
  // Apple / macOS / iOS voices
  samantha: "Sam",
  karen: "Kaz",
  daniel: "Danny",
  alex: "Lex",
  victoria: "Vicky",
  moira: "Moira",
  tessa: "Tessa",
  fiona: "Fi",
  veena: "Veena",
  // Google voices
  "google us english": "Nova",
  "google uk english female": "Luna",
  "google uk english male": "Atlas",
  // Microsoft voices
  "microsoft david": "Dave",
  "microsoft zira": "Zira",
  "microsoft mark": "Marco",
  // Android defaults
  "english united states": "Chip",
  "english united kingdom": "Pip",
};

// Vibrant background palette
const BG_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#82E0AA", "#F8C471",
  "#D7BDE2", "#AED6F1", "#A3E4D7", "#FAD7A0",
  "#F1948A", "#76D7C4", "#7FB3D8", "#73C6B6",
];

// Skin tones
const SKIN_TONES = [
  "#FFDCB5", "#F5C6A5", "#E8B48A", "#D4956B",
  "#C68642", "#8D5524", "#FDEBD0", "#F6DDCC",
];

// Hair colors
const HAIR_COLORS = [
  "#2C1810", "#4A2912", "#8B4513", "#D4A76A",
  "#E8C07A", "#C0392B", "#1A1A2E", "#5D4E37",
  "#2C3E50", "#7F8C8D", "#F39C12",
];

// Eye shapes as SVG snippets (relative to face center)
const EYES = [
  // Big round eyes
  (x: number, y: number, c: string) =>
    `<circle cx="${x - 8}" cy="${y}" r="4" fill="${c}"/><circle cx="${x + 8}" cy="${y}" r="4" fill="${c}"/><circle cx="${x - 7}" cy="${y - 1}" r="1.5" fill="white"/><circle cx="${x + 9}" cy="${y - 1}" r="1.5" fill="white"/>`,
  // Happy squint eyes
  (x: number, y: number, c: string) =>
    `<path d="M${x - 12} ${y} Q${x - 8} ${y - 5} ${x - 4} ${y}" stroke="${c}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M${x + 4} ${y} Q${x + 8} ${y - 5} ${x + 12} ${y}" stroke="${c}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  // Oval eyes
  (x: number, y: number, c: string) =>
    `<ellipse cx="${x - 8}" cy="${y}" rx="4" ry="5" fill="${c}"/><ellipse cx="${x + 8}" cy="${y}" rx="4" ry="5" fill="${c}"/><circle cx="${x - 7}" cy="${y - 1}" r="2" fill="white"/><circle cx="${x + 9}" cy="${y - 1}" r="2" fill="white"/>`,
  // Dot eyes
  (x: number, y: number, c: string) =>
    `<circle cx="${x - 8}" cy="${y}" r="2.5" fill="${c}"/><circle cx="${x + 8}" cy="${y}" r="2.5" fill="${c}"/>`,
];

// Mouth shapes
const MOUTHS = [
  // Smile
  (x: number, y: number) =>
    `<path d="M${x - 7} ${y} Q${x} ${y + 8} ${x + 7} ${y}" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // Big grin
  (x: number, y: number) =>
    `<path d="M${x - 9} ${y - 1} Q${x} ${y + 10} ${x + 9} ${y - 1}" stroke="#c0392b" stroke-width="2" fill="#fff" stroke-linecap="round"/>`,
  // Small smile
  (x: number, y: number) =>
    `<path d="M${x - 4} ${y} Q${x} ${y + 5} ${x + 4} ${y}" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // Cat mouth
  (x: number, y: number) =>
    `<path d="M${x - 6} ${y} L${x} ${y + 3} L${x + 6} ${y}" stroke="#c0392b" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  // Open smile
  (x: number, y: number) =>
    `<ellipse cx="${x}" cy="${y + 2}" rx="6" ry="5" fill="#c0392b"/><ellipse cx="${x}" cy="${y + 1}" rx="4" ry="2.5" fill="white"/>`,
];

// Hair styles as SVG
const HAIR_STYLES = [
  // Spiky top
  (x: number, y: number, r: number, c: string) =>
    `<path d="M${x - r} ${y - 2} Q${x - r + 5} ${y - r - 12} ${x - 5} ${y - r + 2} Q${x - 2} ${y - r - 15} ${x + 3} ${y - r + 1} Q${x + 8} ${y - r - 10} ${x + r} ${y - 2}" fill="${c}"/>`,
  // Round puff
  (x: number, y: number, r: number, c: string) =>
    `<ellipse cx="${x}" cy="${y - r + 5}" rx="${r + 3}" ry="${r - 3}" fill="${c}"/>`,
  // Side swept
  (x: number, y: number, r: number, c: string) =>
    `<path d="M${x - r - 2} ${y + 2} Q${x - r} ${y - r - 8} ${x + 5} ${y - r + 2} Q${x + r + 5} ${y - r - 5} ${x + r + 3} ${y + 5}" fill="${c}"/>`,
  // Bun
  (x: number, y: number, r: number, c: string) =>
    `<circle cx="${x}" cy="${y - r - 3}" r="8" fill="${c}"/><path d="M${x - r} ${y - 5} Q${x - r - 2} ${y - r - 3} ${x} ${y - r + 2} Q${x + r + 2} ${y - r - 3} ${x + r} ${y - 5}" fill="${c}"/>`,
  // None / bald
  () => "",
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return Math.abs(hash);
}

function pick<T>(arr: T[], hash: number, offset = 0): T {
  return arr[((hash >> offset) & 0xffff) % arr.length];
}

export function generateAvatarSvg(voiceName: string): string {
  const h = simpleHash(voiceName);
  const cx = 32;
  const cy = 34;
  const faceR = 18;

  const bg = pick(BG_COLORS, h, 0);
  const skin = pick(SKIN_TONES, h, 4);
  const hair = pick(HAIR_COLORS, h, 8);
  const eyeStyle = pick(EYES, h, 12);
  const mouthStyle = pick(MOUTHS, h, 16);
  const hairStyle = pick(HAIR_STYLES, h, 20);

  const eyeColor = pick(["#2C1810", "#1A5276", "#196F3D", "#4A235A", "#1C2833"], h, 24);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="16" fill="${bg}"/>
  <circle cx="${cx}" cy="${cy}" r="${faceR}" fill="${skin}"/>
  ${hairStyle(cx, cy, faceR, hair)}
  ${eyeStyle(cx, cy - 3, eyeColor)}
  ${mouthStyle(cx, cy + 7)}
  <circle cx="${cx - 10}" cy="${cy + 2}" r="4" fill="${skin}" opacity="0.5" filter="url(#blush)"/>
  <circle cx="${cx + 10}" cy="${cy + 2}" r="4" fill="#FF6B6B" opacity="0.2"/>
  <circle cx="${cx - 10}" cy="${cy + 2}" r="4" fill="#FF6B6B" opacity="0.2"/>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getCuteName(voiceName: string): string {
  const lower = voiceName.toLowerCase();

  // Check exact mapping first
  for (const [key, name] of Object.entries(CUTE_NAMES)) {
    if (lower.includes(key)) return name;
  }

  // Generate a cute name from the voice name
  const parts = voiceName.split(/[\s\-_()]+/).filter(Boolean);
  // Try to find a human-sounding part
  const humanPart = parts.find(
    (p) =>
      p.length > 2 &&
      !p.match(/^(en|us|uk|gb|au|microsoft|google|android|apple|female|male|default|enhanced|premium|compact|online)$/i),
  );

  if (humanPart) {
    // Shorten to a cute nickname
    const name = humanPart.charAt(0).toUpperCase() + humanPart.slice(1, 6).toLowerCase();
    return name;
  }

  // Fallback: generate from hash
  const FALLBACK_NAMES = [
    "Boop", "Fizz", "Pip", "Dot", "Buzz",
    "Pogo", "Riff", "Jinx", "Zap", "Lumi",
    "Koko", "Nix", "Tink", "Wren", "Juno",
  ];
  const h = simpleHash(voiceName);
  return FALLBACK_NAMES[h % FALLBACK_NAMES.length];
}
