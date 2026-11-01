import { useRef, useState } from "react";

import { safeOtherBoardUrl } from "@shared/boardLink";
import type { Ticket } from "@shared/schemas";
import type { MacOutboxItem, VpsPendingSend } from "@shared/vpsBridge";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useOtherBoardLink } from "@/hooks/useOtherBoardLink";
import { api } from "@/lib/api";
import { boardTicketUrl } from "@/lib/boardHash";
import { errorMessage } from "@/lib/errors";

const TRANSFER_SOURCE = "transfer";
const STATUS_CLASSES = "space-y-2 rounded-md border border-border bg-muted/30 p-2 text-xs";

type TransferEntry = { board: "vps"; send: VpsPendingSend } | { board: "mac"; item: MacOutboxItem };

async function loadTransferEntry(cloudHost: boolean, ticketId: string): Promise<TransferEntry | null> {
  if (cloudHost) {
    const { items } = await api.macOutbox();
    const item = items.find((candidate) => candidate.source === TRANSFER_SOURCE && candidate.sourceTicketId === ticketId);
    return item === undefined ? null : { board: "mac", item };
  }
  const send = (await api.vpsSends()).find((candidate) => candidate.sourceTicketId === ticketId);
  return send === undefined ? null : { board: "vps", send };
}

interface PendingTransferProps {
  message: string;
  detail: string | null;
  actionLabel: string;
  confirmDescription: string;
  onConfirm: () => Promise<void>;
}

function PendingTransfer({ message, detail, actionLabel, confirmDescription, onConfirm }: PendingTransferProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div role="status" className={STATUS_CLASSES}>
      <p className="text-warning">{message}</p>
      {detail && <p className="text-muted-foreground">{detail}</p>}
      <Button size="sm" variant="outline" className="w-full" onClick={() => setConfirming(true)}>{actionLabel}</Button>
      <ConfirmDialog
        open={confirming}
        title={actionLabel}
        description={confirmDescription}
        confirmLabel={actionLabel}
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          await onConfirm();
        }}
      />
    </div>
  );
}

/** Where a card sent to the other board stands, shown on the abandoned origin card while its send is tracked here. */
export function CardTransferStatus({ ticket }: { ticket: Ticket }) {
  const { cloudHost, available } = useOtherBoardLink();
  const { settings } = useAppSettings();
  const loadKey = `${ticket.id}:${ticket.updatedAt}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const latestLoad = useRef<string | null>(null);
  const [entry, setEntry] = useState<TransferEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (available && loadedKey !== loadKey) {
    const key = loadKey;
    latestLoad.current = key;
    setLoadedKey(key);
    void loadTransferEntry(cloudHost, ticket.id)
      .then((next) => latestLoad.current === key && setEntry(next))
      .catch((e) => latestLoad.current === key && setError(errorMessage(e)));
  }
  if (!available) return null;

  const act = async (action: () => Promise<unknown>): Promise<void> => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    }
    setLoadedKey(null);
  };

  const errorLine = error === null ? null : <p role="alert" className="text-xs text-danger">{error}</p>;

  if (entry?.board === "vps" && entry.send.status === "pending") {
    const { send } = entry;
    return (
      <>
        <PendingTransfer
          message={`Transfert vers le VPS en attente · ${send.attempts} essai(s). Il est réessayé toutes les 5 minutes, sans doublon.`}
          detail={send.lastError}
          actionLabel="Retirer l'envoi"
          confirmDescription="L'envoi est abandonné et la carte revient dans « À faire ». Le VPS a peut-être déjà créé la carte : vérifiez-le pour éviter un doublon."
          onConfirm={() => act(() => api.dismissVpsSend(send.id))}
        />
        {errorLine}
      </>
    );
  }

  if (entry?.board === "mac" && entry.item.status === "pending") {
    const { item } = entry;
    return (
      <>
        <PendingTransfer
          message="Transfert vers le Mac en attente : le Mac le relève à sa prochaine synchronisation."
          detail={null}
          actionLabel="Annuler l'envoi"
          confirmDescription="La carte revient dans « À faire ». Si le Mac a déjà relevé l'envoi, la carte peut exister des deux côtés."
          onConfirm={() => act(() => api.cancelMacOutboxTransfer(item.id))}
        />
        {errorLine}
      </>
    );
  }

  if (entry?.board === "mac" && entry.item.status === "received") {
    const otherBoardUrl = safeOtherBoardUrl(settings?.otherBoardUrl);
    const macTicketId = entry.item.macTicketId;
    return (
      <div role="status" className={STATUS_CLASSES}>
        <p>Carte reçue par le Mac.</p>
        {otherBoardUrl !== null && macTicketId !== null && (
          <a href={boardTicketUrl(otherBoardUrl, macTicketId)} target="_blank" rel="noreferrer" className="underline">
            Ouvrir la carte sur le board Mac
          </a>
        )}
      </div>
    );
  }

  return errorLine;
}
