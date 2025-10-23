"use client";

import { useState } from "react";
import { GlobalUploadDrawer } from "./GlobalUploadDrawer";

export function useGlobalUploadDrawer() {
  const [open, setOpen] = useState(false);

  const openDrawer = () => setOpen(true);
  const closeDrawer = () => setOpen(false);

  const Drawer = () => (
    <GlobalUploadDrawer open={open} onOpenChange={setOpen} />
  );

  return {
    openDrawer,
    closeDrawer,
    Drawer,
  };
}
