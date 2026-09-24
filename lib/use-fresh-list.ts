"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export const MASTER_CHANGED_EVENT = "umer:master-changed";
export const DATA_CHANGED_EVENT = "umer:data-changed";

/** Call after Settings create/update/delete so form dropdowns reload. */
export function notifyMasterDataChanged() {
  try {
    sessionStorage.setItem("umer:master:rev", String(Date.now()));
    window.dispatchEvent(new Event(MASTER_CHANGED_EVENT));
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

/** Call after purchase / issue / receive so dashboard stock updates. */
export function notifyDataChanged() {
  try {
    sessionStorage.setItem("umer:dash:force", "1");
    sessionStorage.removeItem("umer:dashboard:v1");
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * Keeps dropdown lists fresh: reloads on mount, route change, focus,
 * and after Settings / transaction changes — no manual browser refresh needed.
 */
export function useFreshList<T>(endpoint: string, initial: T[]): T[] {
  const pathname = usePathname();
  const [items, setItems] = useState<T[]>(initial);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`${endpoint}?_=${Date.now()}`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Pragma: "no-cache" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setItems(data as T[]);
    } catch {
      /* keep current list */
    }
  }, [endpoint]);

  useEffect(() => {
    void reload();
  }, [reload, pathname]);

  useEffect(() => {
    const onFocus = () => void reload();
    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const onMaster = () => void reload();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(MASTER_CHANGED_EVENT, onMaster);
    window.addEventListener(DATA_CHANGED_EVENT, onMaster);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(MASTER_CHANGED_EVENT, onMaster);
      window.removeEventListener(DATA_CHANGED_EVENT, onMaster);
    };
  }, [reload]);

  return items;
}
