"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { MobileNav } from "@/components/layout/sidebar";

export function Header({ userName }: { userName: string }) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex items-center gap-2">
        <MobileNav />
        <h1 className="font-heading text-base font-semibold tracking-tight md:hidden">
          Talha Traders
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-lg px-2 py-1">
          <Avatar className="size-8">
            <AvatarFallback>{initials || "AD"}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{userName}</span>
        </div>
      </div>
    </header>
  );
}
