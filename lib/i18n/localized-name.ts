import type { Language } from "@/lib/i18n/language-context";
import { localizedName as localize } from "@/lib/i18n/localize";

export type NamedEntity = {
  name: string;
  nameUr?: string | null;
};

/** Pick English or Urdu name for display. Auto-Urdu if nameUr empty. */
export function localizedName(
  entity: NamedEntity | null | undefined,
  language: Language,
  fallback = "—"
): string {
  const value = localize(entity, language);
  return value || fallback;
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
