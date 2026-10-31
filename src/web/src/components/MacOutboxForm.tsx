import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { safeOtherBoardUrl } from "@shared/boardLink";
import { deriveTitleFromDescription } from "@shared/schemas";
import type { MacOutboxItem, MacOutboxState } from "@shared/vpsBridge";

import { OtherBoardDraftFields, boardProjectOptionLabel } from "@/components/BoardTargetSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAppSettings } from "@/hooks/useAppSettings";
import { api } from "@/lib/api";
import { boardTicketUrl } from "@/lib/boardHash";
import { formatDateTime } from "@/lib/display";
import { errorMessage } from "@/lib/errors";
import { FIELD_LABEL_CLASSES, SHEET_FOOTER_CLASSES } from "@/lib/overlayStyles";

const ITEM_STATUS_LABELS: Record<MacOutboxItem["status"], string> = {
  pending: "En attente du Mac",
  received: "Reçue par le Mac",
  rejected: "Refusée par le Mac",
};

const ITEM_SOURCE_LABELS: Record<MacOutboxItem["source"], string> = {
  board: "depuis le board",
  agent: "par un agent",
};

function itemTitle(item: MacOutboxItem): string {
  return item.title.trim() || deriveTitleFromDescription(item.description);
}

function MacOutboxList({ items, otherBoardUrl }: { items: MacOutboxItem[]; otherBoardUrl: string | null }) {
  return (
    <section className="space-y-2 rounded-md border border-border p-3">
      <h3 className="text-sm font-medium">Envoyés au Mac ({items.length})</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="space-y-0.5 text-xs">
            <p className="font-medium text-foreground">{itemTitle(item)}</p>
            <p className="text-muted-foreground">
              {item.projectLabel ?? item.project} · {ITEM_STATUS_LABELS[item.status]}
              {item.receivedAt !== null && ` le ${formatDateTime(item.receivedAt)}`} · envoyée le {formatDateTime(item.createdAt)} {ITEM_SOURCE_LABELS[item.source]}
            </p>
            {item.status === "rejected" && item.reason && <p className="text-danger">{item.reason}</p>}
            {item.macTicketId !== null && otherBoardUrl !== null && (
              <a href={boardTicketUrl(otherBoardUrl, item.macTicketId)} target="_blank" rel="noreferrer" className="underline">
                Ouvrir la carte sur le board Mac
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface MacOutboxFormProps {
  header: ReactNode;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  onDraftSent: () => void;
  onClose: () => void;
}

export function MacOutboxForm({ header, title, onTitleChange, description, onDescriptionChange, onDraftSent, onClose }: MacOutboxFormProps) {
  const { settings } = useAppSettings();
  const otherBoardUrl = safeOtherBoardUrl(settings?.otherBoardUrl);
  const [loadKey, setLoadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState<number | null>(null);
  const latestLoad = useRef(0);
  const [state, setState] = useState<MacOutboxState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const [clientId, setClientId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTitle, setSentTitle] = useState<string | null>(null);

  if (loadedKey !== loadKey) {
    const key = loadKey;
    latestLoad.current = key;
    setLoadedKey(key);
    setLoadError(null);
    void api
      .macOutbox()
      .then((loaded) => latestLoad.current === key && setState(loaded))
      .catch((e) => latestLoad.current === key && setLoadError(errorMessage(e)));
  }
  const refresh = (): void => setLoadKey((key) => key + 1);

  const catalogue = state?.catalogue ?? null;
  const projects = catalogue?.projects ?? [];
  const project = projects.find((candidate) => candidate.key === projectChoice)?.key ?? projects[0]?.key ?? "";
  const submitDisabled = busy || !project || (!title.trim() && !description.trim());

  const submit = (): void => {
    setError(null);
    setBusy(true);
    void api
      .enqueueMacOutbox({ clientId, project, title, description })
      .then(({ item }) => {
        setSentTitle(itemTitle(item));
        setClientId(crypto.randomUUID());
        onDraftSent();
        refresh();
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setBusy(false));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {header}
          <p className="text-xs text-muted-foreground">
            La carte attend dans la boîte d’envoi du VPS, même si le Mac dort. Le Mac la récupère à sa prochaine synchronisation (toutes les 5 minutes quand l’application est ouverte) et la crée verrouillée : elle ne démarre qu’après votre approbation sur le Mac. Seuls le projet, le titre et la description sont transmis.
          </p>
          {sentTitle !== null && (
            <p role="status" className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              « {sentTitle} » est en attente du Mac dans la boîte d’envoi.
            </p>
          )}
          {catalogue?.stale && (
            <p role="alert" className="rounded-md border border-border bg-muted/30 p-3 text-sm text-warning">
              Catalogue du Mac publié le {formatDateTime(catalogue.publishedAt)}, il y a plus de 24 h : le Mac n’a pas synchronisé depuis, ses projets autorisés ont pu changer. La carte sera revérifiée à la réception.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="mac-project" className={FIELD_LABEL_CLASSES}>
              Projet du Mac{catalogue?.boardName ? ` (${catalogue.boardName})` : ""}
            </Label>
            {loadError === null ? (
              <Select id="mac-project" value={project} onChange={(e) => setProjectChoice(e.target.value)} disabled={state === null} className="w-full">
                {state === null && <option value="">Chargement du catalogue du Mac…</option>}
                {state !== null && projects.length === 0 && <option value="">Aucun projet autorisé publié par le Mac</option>}
                {projects.map((candidate) => (
                  <option key={candidate.key} value={candidate.key}>{boardProjectOptionLabel(candidate)}</option>
                ))}
              </Select>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p role="alert" className="text-xs text-danger">Boîte d’envoi indisponible : {loadError}</p>
                <Button type="button" size="sm" variant="outline" onClick={refresh}>Réessayer</Button>
              </div>
            )}
          </div>
          <OtherBoardDraftFields
            idPrefix="mac"
            title={title}
            onTitleChange={onTitleChange}
            description={description}
            onDescriptionChange={onDescriptionChange}
            boardLabel="Mac"
          />
          {state !== null && state.items.length > 0 && <MacOutboxList items={state.items} otherBoardUrl={otherBoardUrl} />}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </div>
      <div className={SHEET_FOOTER_CLASSES}>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {sentTitle === null ? "Annuler" : "Fermer"}
        </Button>
        <Button size="sm" variant="outline" onClick={refresh} disabled={busy}>Actualiser</Button>
        <Button size="sm" onClick={submit} disabled={submitDisabled}>
          {busy ? "Envoi…" : "Envoyer au Mac"}
        </Button>
      </div>
    </div>
  );
}
