"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  ArrowRightLeft,
  PackageCheck,
  FileDown,
  Settings,
  LogOut,
  Menu,
  ClipboardCheck,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { useLanguage, type TranslationKey } from "@/lib/i18n/language-context";
import { useNavigation } from "@/components/layout/navigation";

const navItems: {
  href: string;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
}[] = [
  { href: "/dashboard", labelKey: "dashboardHome", icon: LayoutDashboard },
  {
    href: "/dashboard/purchase",
    labelKey: "purchaseMaterial",
    icon: ShoppingCart,
  },
  {
    href: "/dashboard/issue",
    labelKey: "issueToWorker",
    icon: ArrowRightLeft,
  },
  {
    href: "/dashboard/receive",
    labelKey: "receiveProduct",
    icon: PackageCheck,
  },
  {
    href: "/dashboard/statement",
    labelKey: "downloadStatement",
    icon: FileDown,
  },
  {
    href: "/dashboard/attendance",
    labelKey: "markAttendance",
    icon: ClipboardCheck,
  },
  {
    href: "/dashboard/salary",
    labelKey: "salaryStatement",
    icon: Wallet,
  },
  {
    href: "/dashboard/settings",
    labelKey: "settings",
    icon: Settings,
  },
];

function NavLinks({
  onNavigate,
  onLogout,
}: {
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { pathname, pendingHref, isPending, isActive, markPending } =
    useNavigation();

  function handleClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    // Instant active highlight; block spam-clicks while a transition is pending
    if (pendingHref && pendingHref !== href) {
      event.preventDefault();
      return;
    }
    if (href === pathname && !pendingHref) {
      event.preventDefault();
      onNavigate?.();
      return;
    }
    // Prefetch immediately on click (in case hover never happened)
    router.prefetch(href);
    markPending(href);
    onNavigate?.();
  }

  return (
    <nav className="flex flex-col gap-1" aria-busy={isPending}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        const isThisPending = pendingHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            // Prefetch only on hover — prefetching every link on mount saturates the DB pool
            prefetch={false}
            onMouseEnter={() => router.prefetch(item.href)}
            onFocus={() => router.prefetch(item.href)}
            onClick={(e) => handleClick(e, item.href)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
              isPending && !isThisPending && "pointer-events-none opacity-50"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(item.labelKey)}
          </Link>
        );
      })}
      <Button
        variant="ghost"
        disabled={isPending}
        className="w-full justify-start gap-3 px-3 text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
        onClick={onLogout}
      >
        <LogOut className="size-4 shrink-0" />
        {t("logout")}
      </Button>
    </nav>
  );
}

async function logout(
  router: ReturnType<typeof useRouter>,
  loggedOutMessage: string
) {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  if (res.ok) {
    toast.success(loggedOutMessage);
    router.push("/login");
    router.refresh();
  }
}

export function DesktopSidebar() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-sidebar-border bg-sidebar px-4">
        <Link
          href="/dashboard"
          prefetch={false}
          className="font-heading text-lg font-semibold tracking-tight"
        >
          Talha Traders
        </Link>
      </div>
      <div className="p-3">
        <NavLinks onLogout={() => logout(router, t("loggedOut"))} />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const router = useRouter();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("openMenu")}
            className="md:hidden"
          />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">{t("navigation")}</SheetTitle>
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <span className="font-heading text-lg font-semibold">
            Talha Traders
          </span>
        </div>
        <div className="p-3">
          <NavLinks
            onNavigate={() => setOpen(false)}
            onLogout={() => logout(router, t("loggedOut"))}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
