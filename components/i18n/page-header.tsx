"use client";

import { useLanguage, type TranslationKey } from "@/lib/i18n/language-context";

export function PageHeader({
  titleKey,
  descriptionKey,
}: {
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold tracking-tight">
        {t(titleKey)}
      </h2>
      {descriptionKey ? (
        <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
      ) : null}
    </div>
  );
}
