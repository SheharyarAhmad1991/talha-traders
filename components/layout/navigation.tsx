"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type NavigationContextValue = {
  pathname: string;
  pendingHref: string | null;
  isPending: boolean;
  isActive: (href: string) => boolean;
  navigate: (href: string) => void;
  markPending: (href: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const isActive = useCallback(
    (href: string) => {
      const current = pendingHref || pathname;
      if (href === "/dashboard") return current === "/dashboard";
      return current === href || current.startsWith(`${href}/`);
    },
    [pathname, pendingHref]
  );

  const markPending = useCallback((href: string) => {
    setPendingHref(href);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname || pendingHref) return;
      setPendingHref(href);
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, pendingHref, router]
  );

  const value = useMemo(
    () => ({
      pathname,
      pendingHref,
      isPending: isPending || pendingHref !== null,
      isActive,
      navigate,
      markPending,
    }),
    [pathname, pendingHref, isPending, isActive, navigate, markPending]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return ctx;
}

export function NavPendingBar() {
  const { isPending } = useNavigation();
  if (!isPending) return null;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-transparent"
      aria-hidden
    >
      <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] bg-primary" />
    </div>
  );
}
