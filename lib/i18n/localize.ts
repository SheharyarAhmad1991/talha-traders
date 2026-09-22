import { autoUrduName, autoUrduUnit } from "@/lib/i18n/auto-urdu";

export type AppLanguage = "en" | "ur";

export type NamedItem = {
  name: string;
  nameUr?: string | null;
};

/**
 * English mode → English name.
 * Urdu mode → saved nameUr, or auto Urdu from English so nothing stays Latin.
 */
export function localizedName(
  item: NamedItem | null | undefined,
  language: AppLanguage
): string {
  if (!item) return "";
  const english = item.name?.trim() || "";
  if (language !== "ur") return english;

  const saved = item.nameUr?.trim();
  if (saved) return saved;
  return autoUrduName(english) || english;
}

export function optionLabel(
  item: NamedItem & { unit?: string | null },
  language: AppLanguage
): string {
  const name = localizedName(item, language);
  if (!item.unit) return name;
  const unit =
    language === "ur" ? autoUrduUnit(item.unit) || item.unit : item.unit;
  return `${name} (${unit})`;
}
