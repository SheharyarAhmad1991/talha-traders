/**
 * Convert English / Roman admin names to everyday Urdu for display.
 * Used when nameUr is empty so Urdu mode never shows English leftovers.
 */

const WORD_MAP: Record<string, string> = {
  // factories / roles
  factory: "فیکٹری",
  dealer: "ڈیلر",
  worker: "مزدور",
  labor: "مزدور",
  labour: "مزدور",
  // materials (common factory slang)
  plastic: "پلاسٹک",
  dana: "دانہ",
  tape: "ٹیپ",
  gatty: "گٹی",
  gatti: "گٹی",
  gattee: "گٹی",
  paper: "کاغذ",
  cardboard: "گتا",
  board: "بورڈ",
  roll: "رول",
  rolls: "رول",
  film: "فلم",
  sheet: "شیٹ",
  wire: "تار",
  rope: "رسی",
  cloth: "کپڑا",
  fabric: "کپڑا",
  yarn: "دھاگہ",
  thread: "دھاگہ",
  glue: "گوند",
  oil: "تیل",
  chemical: "کیمیکل",
  powder: "پاؤڈر",
  carton: "کارٹن",
  box: "ڈبہ",
  bag: "بیگ",
  sack: "بوری",
  // people / common names
  ali: "علی",
  bilal: "بلال",
  hassan: "حسن",
  hussein: "حسین",
  husain: "حسین",
  usman: "عثمان",
  omar: "عمر",
  umer: "عمر",
  umar: "عمر",
  ahmed: "احمد",
  ahmad: "احمد",
  mohammad: "محمد",
  muhammad: "محمد",
  neha: "نہا",
  hassnian: "حسنیان",
  hasnain: "حسنین",
  // units / misc
  kg: "کلو",
  kgs: "کلو",
  kilo: "کلو",
  kilogram: "کلو",
  pcs: "پیس",
  pc: "پیس",
  piece: "پیس",
  pieces: "پیس",
  meter: "میٹر",
  metre: "میٹر",
  mtr: "میٹر",
  liter: "لٹر",
  litre: "لٹر",
  dozen: "درجن",
};

const ARABIC_RE = /[\u0600-\u06FF]/;

/** Simple Roman → Urdu letter map for leftover names. */
const CHAR_MAP: Record<string, string> = {
  a: "ا",
  b: "ب",
  c: "ک",
  d: "د",
  e: "ے",
  f: "ف",
  g: "گ",
  h: "ہ",
  i: "ی",
  j: "ج",
  k: "ک",
  l: "ل",
  m: "م",
  n: "ن",
  o: "و",
  p: "پ",
  q: "ق",
  r: "ر",
  s: "س",
  t: "ت",
  u: "و",
  v: "و",
  w: "و",
  x: "کس",
  y: "ی",
  z: "ز",
};

function transliterateToken(token: string): string {
  const lower = token.toLowerCase();
  if (WORD_MAP[lower]) return WORD_MAP[lower];
  if (ARABIC_RE.test(token)) return token;
  if (/^\d+$/.test(token)) return token;

  let out = "";
  for (const ch of lower) {
    if (CHAR_MAP[ch]) out += CHAR_MAP[ch];
    else if (/\d/.test(ch)) out += ch;
    else if (ch === "-" || ch === "_") out += " ";
    // skip other punctuation
  }
  return out || token;
}

/** Convert any English/Roman admin label to Urdu script for display. */
export function autoUrduName(name: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return "";
  if (ARABIC_RE.test(trimmed) && !/[A-Za-z]{2,}/.test(trimmed)) {
    return trimmed;
  }

  // Keep separators; translate word by word
  return trimmed
    .split(/(\s+|[-_/]+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || /^[-_/]+$/.test(part)) return part;
      return transliterateToken(part);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function autoUrduUnit(unit: string | null | undefined): string {
  if (!unit?.trim()) return "";
  const key = unit.trim().toLowerCase();
  return WORD_MAP[key] || autoUrduName(unit);
}
