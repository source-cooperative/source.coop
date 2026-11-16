"use client";

import { useEffect, useState } from "react";
import { loadCatalog, peekCatalog } from "@/lib/catalog";
import type { CatalogEntry } from "@/types/catalog";

export function useCatalog(enabled: boolean) {
  const [catalog, setCatalog] = useState(peekCatalog);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadCatalog().then(
      (entries) => {
        if (active) setCatalog(entries);
      },
      () => {
        if (active) setCatalog(undefined);
      }
    );
    return () => {
      active = false;
    };
  }, [enabled]);

  return enabled ? catalog : undefined;
}
