import { useAppSettings } from "@/hooks/useAppSettings";
import { useCapabilities } from "@/hooks/useCapabilities";

export interface OtherBoardLink {
  cloudHost: boolean;
  available: boolean;
}

/** Whether this board can reach the other one: the Mac outbox on the VPS, the SSH alias on the Mac. */
export function useOtherBoardLink(): OtherBoardLink {
  const { cloudHost, macOutbox } = useCapabilities();
  const { settings } = useAppSettings();
  return { cloudHost, available: cloudHost ? macOutbox : Boolean(settings?.sshHostAlias) };
}
