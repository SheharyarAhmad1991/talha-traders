export type AppLanguage = "en" | "ur";

export type NamedItem = {
  name: string;
  nameUr?: string | null;
};

/** Show Urdu name when language is ur (fallback to English name). */
export function localizedName(
  item: NamedItem | null | undefined,
  language: AppLanguage
): string {
  if (!item) return "";
  if (language === "ur" && item.nameUr?.trim()) {
    return item.nameUr.trim();
  }
  return item.name;
}

export function optionLabel(
  item: NamedItem & { unit?: string | null },
  language: AppLanguage
): string {
  const name = localizedName(item, language);
  return item.unit ? `${name} (${item.unit})` : name;
}
