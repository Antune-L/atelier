import { useState } from "react";

import type { Capabilities } from "@shared/schemas";

import { api } from "@/lib/api";

const UNKNOWN_CAPABILITIES: Capabilities = {
  composerAvailable: false,
  defaultModel: "",
  defaultEffort: "",
  defaultImplementerModel: "",
  defaultImplementerEffort: "",
  canUpdate: false,
};

let cache: Capabilities | null = null;
const subscribers = new Set<(caps: Capabilities) => void>();

function loadOnce(): void {
  if (cache !== null) return;
  void api.capabilities().then((data) => {
    cache = data;
    for (const notify of subscribers) notify(data);
  });
}

/** Loads backend capability flags (e.g. Composer availability) once, cached at module scope. */
export function useCapabilities(): Capabilities {
  const [caps, setCaps] = useState<Capabilities>(cache ?? UNKNOWN_CAPABILITIES);

  if (cache === null) {
    subscribers.add(setCaps);
    loadOnce();
  }

  return caps;
}
