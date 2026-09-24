"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Warm main menu routes in the background so the first click feels fast. */
const WARM_ROUTES = [
  "/dashboard",
  "/dashboard/purchase",
  "/dashboard/issue",
  "/dashboard/receive",
  "/dashboard/statement",
  "/dashboard/attendance",
  "/dashboard/salary",
  "/dashboard/settings",
] as const;

export function RouteWarmer() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let idleHandle: number | undefined;

    const run = () => {
      // One route at a time with a gap — avoids flooding Supabase pool
      WARM_ROUTES.forEach((href, index) => {
        if (href === pathname) return;
        timers.push(
          setTimeout(() => {
            if (!cancelled) router.prefetch(href);
          }, 800 + index * 700)
        );
      });

      // Warm master-data APIs used by forms (cached after first hit)
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          void Promise.allSettled([
            fetch("/api/dealers?warm=1", { credentials: "same-origin" }),
            fetch("/api/materials?warm=1", { credentials: "same-origin" }),
            fetch("/api/workers?warm=1", { credentials: "same-origin" }),
            fetch("/api/products?warm=1", { credentials: "same-origin" }),
          ]);
        }, 2500)
      );
    };

    // Wait until the browser is idle so the current page stays snappy
    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(run, { timeout: 4000 });
    } else {
      timers.push(setTimeout(run, 1500));
    }

    return () => {
      cancelled = true;
      if (
        idleHandle != null &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleHandle);
      }
      timers.forEach((t) => clearTimeout(t));
    };
  }, [router, pathname]);

  return null;
}
