"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  ArrowRightLeft,
  PackageCheck,
  FileDown,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Dashboard Home", icon: LayoutDashboard },
  {
    href: "/dashboard/purchase",
    label: "Purchase Material",
    icon: ShoppingCart,
  },
  {
    href: "/dashboard/issue",
    label: "Issue to Worker",
    icon: ArrowRightLeft,
  },
  {
    href: "/dashboard/receive",
    label: "Receive Product",
    icon: PackageCheck,
  },
  {
    href: "/dashboard/statement",
    label: "Download Statement",
    icon: FileDown,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
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
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 px-3 text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
        onClick={onLogout}
      >
        <LogOut className="size-4 shrink-0" />
        Logout
      </Button>
    </nav>
  );
}

async function logout(router: ReturnType<typeof useRouter>) {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  if (res.ok) {
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  }
}

export function DesktopSidebar() {
  const router = useRouter();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-sidebar-border bg-sidebar px-4">
        <Link
          href="/dashboard"
          className="font-heading text-lg font-semibold tracking-tight"
        >
          Umer Traders
        </Link>
      </div>
      <div className="p-3">
        <NavLinks onLogout={() => logout(router)} />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
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
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <span className="font-heading text-lg font-semibold">
            Umer Traders
          </span>
        </div>
        <div className="p-3">
          <NavLinks
            onNavigate={() => setOpen(false)}
            onLogout={() => logout(router)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
