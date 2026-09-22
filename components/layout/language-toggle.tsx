"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";

export function LanguageToggle() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="min-w-16 font-medium"
      aria-label={language === "en" ? t("switchToUrdu") : t("switchToEnglish")}
    >
      {language === "en" ? t("switchToUrdu") : t("switchToEnglish")}
    </Button>
  );
}
