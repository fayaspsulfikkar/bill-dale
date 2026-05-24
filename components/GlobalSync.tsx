"use client";

import { useDataSync } from "@/hooks/useDataSync";

export function GlobalSync() {
  useDataSync();
  return null;
}
