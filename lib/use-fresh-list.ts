"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export const MASTER_CHANGED_EVENT = "talha:master-changed";
export const DATA_CHANGED_EVENT = "talha:data-changed";

const FRESH_TTL_MS = 15_000;

/** Call after Settings create/update/delete so form dropdowns reload. */
export function notifyMasterDataChanged() {
  try {
    sessionStorage.setItem("talha:master:rev", String(Date.now()));
    window.dispatchEvent(new Event(MASTER_CHANGED_EVENT));
    // Rare path — also refresh pages that show stock counts after material add
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

/** Call after purchase / issue / receive so live stock panels update. */
export function notifyDataChanged() {
  try {
    sessionStorage.setItem("talha:dash:force", "1");
    sessionStorage.removeItem("talha:dashboard:v1");
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * Keeps dropdown lists fresh without over-fetching.
 * Reloads only on route change, master edits, or stale focus — not on every stock change.
 */
export function useFreshList<T>(endpoint: string, initial: T[]): T[] {
  const pathname = usePathname();
  const [items, setItems] = useState<T[]>(initial);
  const lastFetchAt = useRef(0);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const reload = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastFetchAt.current < FRESH_TTL_MS) return;
      try {
        const res = await fetch(`${endpoint}?_=${now}`, {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Pragma: "no-cache" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setItems(data as T[]);
          lastFetchAt.current = Date.now();
        }
      } catch {
        /* keep current list */
      }
    },
    [endpoint]
  );

  useEffect(() => {
    void reload(true);
  }, [reload, pathname]);

  useEffect(() => {
    const onFocus = () => void reload(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload(false);
    };
    // Master list edits only — stock changes must not re-download dealers/etc.
    const onMaster = () => void reload(true);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(MASTER_CHANGED_EVENT, onMaster);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(MASTER_CHANGED_EVENT, onMaster);
    };
  }, [reload]);

  return items;
}
