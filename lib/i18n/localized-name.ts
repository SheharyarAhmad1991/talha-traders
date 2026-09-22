import type { Language } from "@/lib/i18n/language-context";

export type NamedEntity = {
  name: string;
  nameUr?: string | null;
};

/** Pick English or Urdu name for display. Falls back to English if Urdu is empty. */
export function localizedName(
  entity: NamedEntity | null | undefined,
  language: Language,
  fallback = "—"
): string {
  if (!entity) return fallback;
  if (language === "ur" && entity.nameUr?.trim()) {
    return entity.nameUr.trim();
  }
  return entity.name?.trim() || fallback;
}

export function withLocalizedLabel<T extends NamedEntity & { id: string }>(
  items: T[],
  language: Language,
  format?: (item: T, label: string) => string
): { value: string; label: string }[] {
  return items.map((item) => {
    const label = localizedName(item, language);
    return {
      value: item.id,
      label: format ? format(item, label) : label,
    };
  });
}
