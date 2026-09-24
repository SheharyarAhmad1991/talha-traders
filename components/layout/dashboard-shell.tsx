"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { DesktopSidebar } from "@/components/layout/sidebar";
import {
  NavigationProvider,
  NavPendingBar,
} from "@/components/layout/navigation";
import {
  DATA_CHANGED_EVENT,
  MASTER_CHANGED_EVENT,
} from "@/lib/use-fresh-list";

function MainContent({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const onChange = () => {
      router.refresh();
    };
    window.addEventListener(MASTER_CHANGED_EVENT, onChange);
    window.addEventListener(DATA_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(MASTER_CHANGED_EVENT, onChange);
      window.removeEventListener(DATA_CHANGED_EVENT, onChange);
    };
  }, [router]);

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
