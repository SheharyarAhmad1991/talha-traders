import { autoUrduName, autoUrduUnit } from "@/lib/i18n/auto-urdu";

export type AppLanguage = "en" | "ur";

export type NamedItem = {
  name: string;
  nameUr?: string | null;
};

function looksLatin(text: string) {
  return /[A-Za-z]{2,}/.test(text);
}

/**
 * English mode → English name.
 * Urdu mode → saved Urdu nameUr, otherwise auto-convert English → Urdu.
 * Never leave English/Latin text visible in Urdu mode.
 */
export function localizedName(
  item: NamedItem | null | undefined,
  language: AppLanguage
): string {
  if (!item) return "";
  const english = item.name?.trim() || "";
  if (language !== "ur") return english;

  const saved = item.nameUr?.trim() || "";
  if (saved && !looksLatin(saved)) return saved;

  return autoUrduName(english) || autoUrduName(saved) || english;
}

/** Localize any free-text admin value (log snapshots, badges, etc.). */
export function localizeText(
  text: string | null | undefined,
  language: AppLanguage
): string {
  if (!text?.trim()) return "";
  if (language !== "ur") return text.trim();
  if (!looksLatin(text)) return text.trim();
  return autoUrduName(text) || text.trim();
}

export function optionLabel(
  item: NamedItem & { unit?: string | null },
  language: AppLanguage
): string {
  const name = localizedName(item, language);
  if (!item.unit) return name;
  const unit =
    language === "ur"
      ? autoUrduUnit(item.unit) || localizeText(item.unit, language)
      : item.unit;
  return `${name} (${unit})`;
}
