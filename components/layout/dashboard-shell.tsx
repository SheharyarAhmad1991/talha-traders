"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { DesktopSidebar } from "@/components/layout/sidebar";
import {
  NavigationProvider,
  NavPendingBar,
} from "@/components/layout/navigation";
import { RouteWarmer } from "@/components/layout/route-warmer";
import {
  DATA_CHANGED_EVENT,
  MASTER_CHANGED_EVENT,
} from "@/lib/use-fresh-list";

/** Only refresh server UI for pages that show live stock / masters. */
function shouldRefreshOnDataChange(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/issue") ||
    pathname.startsWith("/dashboard/statement")
  );
}

function MainContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onMaster = () => router.refresh();
    const onData = () => {
      if (shouldRefreshOnDataChange(pathname)) router.refresh();
    };
    window.addEventListener(MASTER_CHANGED_EVENT, onMaster);
    window.addEventListener(DATA_CHANGED_EVENT, onData);
    return () => {
      window.removeEventListener(MASTER_CHANGED_EVENT, onMaster);
      window.removeEventListener(DATA_CHANGED_EVENT, onData);
    };
  }, [router, pathname]);

  return (
    <main className="relative min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
      <NavPendingBar />
      {children}
    </main>
  );
}

export function DashboardShell({
  userName,
  children,
}: {
  userName: string;
  children: ReactNode;
}) {
  return (
    <NavigationProvider>
      <RouteWarmer />
      <div className="flex h-screen overflow-hidden bg-background">
        <DesktopSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Header userName={userName} />
          <MainContent>{children}</MainContent>
        </div>
      </div>
    </NavigationProvider>
  );
}
