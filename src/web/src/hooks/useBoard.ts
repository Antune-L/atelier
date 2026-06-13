import { useSyncExternalStore } from "react";

import { boardStore, type BoardState } from "@/lib/store";

export function useBoard(): BoardState {
  return useSyncExternalStore(boardStore.subscribe, boardStore.getSnapshot);
}
