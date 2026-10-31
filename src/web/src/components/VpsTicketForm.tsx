import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { safeOtherBoardUrl } from "@shared/boardLink";
import { VCS_PROVIDER_LABELS } from "@shared/constants";
import { deriveTitleFromDescription } from "@shared/schemas";
import type { VpsAnalysisMode, VpsCreateTicketResponse, VpsPendingSend, VpsProject } from "@shared/vpsBridge";

import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SplitButton, SplitMenuItem } from "@/components/ui/split-button";
import { Tabs } from "@/components/ui/tabs";
import type { TabOption } from "@/components/ui/tabs";
import { useAppSettings } from "@/hooks/useAppSettings";
import { api } from "@/lib/api";
import { boardTicketUrl } from "@/lib/boardHash";
import { errorMessage } from "@/lib/errors";
import { FIELD_LABEL_CLASSES, SHEET_FOOTER_CLASSES } from "@/lib/overlayStyles";

export type BoardTarget = "local" | "vps";

const BOARD_TARGET_OPTIONS: readonly TabOption<BoardTarget>[] = [
  { value: "local", label: "Ce Mac" },
  { value: "vps", label: "VPS" },
];

const SEND_STATUS_LABELS: Record<VpsPendingSend["status"], string> = {
  pending: "En attente du VPS",
  failed: "Refusé par le VPS",
};

export function BoardTargetSelect({ value, onChange }: { value: BoardTarget; onChange: (target: BoardTarget) => void }) {
  return (
    <div className="space-y-1.5">
      <span id="board-target-label" className={FIELD_LABEL_CLASSES}>Board cible</span>
      <Tabs aria-labelledby="board-target-label" options={BOARD_TARGET_OPTIONS} value={value} onChange={onChange} />
    </div>
  );
}

function sendTitle(send: VpsPendingSend): string {
  return send.draft.title.trim() || deriveTitleFromDescription(send.draft.description);
}

interface VpsTicketFormProps {
  header: ReactNode;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  onDraftSent: () => void;
  onClose: () => void;
}

/** "Board cible: VPS" mode of the creation form: TODO cards on the VPS board, with or without analysis. */
export function VpsTicketForm({ header, title, onTitleChange, description, onDescriptionChange, onDraftSent, onClose }: VpsTicketFormProps) {
  const { settings } = useAppSettings();
  const otherBoardUrl = safeOtherBoardUrl(settings?.otherBoardUrl);
  const [loadKey, setLoadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState<number | null>(null);
  const latestLoad = useRef(0);
  const [projects, setProjects] = useState<VpsProject[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const [sends, setSends] = useState<VpsPendingSend[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [receipt, setReceipt] = useState<VpsCreateTicketResponse | null>(null);

  const refreshSends = (): void => {
    void api.vpsSends().then(setSends).catch((e) => setError(errorMessage(e)));
  };

  // Load the VPS projects and the pending sends on mount and on each retry (no-useEffect idiom).
  if (loadedKey !== loadKey) {
    const key = loadKey;
    latestLoad.current = key;
    setLoadedKey(key);
    setProjects(null);
    setProjectsError(null);
    void api
      .vpsProjects()
      .then((list) => latestLoad.current === key && setProjects(list))
      .catch((e) => latestLoad.current === key && setProjectsError(errorMessage(e)));
    refreshSends();
  }

  const project = projects?.find((candidate) => candidate.key === projectChoice)?.key ?? projects?.[0]?.key ?? "";
  const submitDisabled = busy || !project || (!title.trim() && !description.trim());

  const submit = (analysis: VpsAnalysisMode): void => {
    setMenuOpen(false);
    setError(null);
    setBusy(true);
    void api
      .createVpsTicket({ project, title, description, analysis })
      .then((response) => {
        setReceipt(response);
        onDraftSent();
        refreshSends();
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setBusy(false));
  };

  const dismiss = (id: string): void => {
    void api.dismissVpsSend(id).then(refreshSends).catch((e) => setError(errorMessage(e)));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {header}
          <p className="text-xs text-muted-foreground">
            Carte « À faire » créée sur le board VPS, non verrouillée, avec les réglages par défaut du projet VPS. Dépendances, profils du Mac, programmation, pièces jointes et options de livraison ne s’appliquent pas.
          </p>
          {receipt?.status === "created" && (
            <div role="status" className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p>Carte créée sur le VPS : « {receipt.ticket.title} ».</p>
              {otherBoardUrl === null ? (
                <p className="text-xs text-muted-foreground">Renseignez l’URL de l’autre board dans les réglages pour ouvrir la carte d’ici.</p>
              ) : (
                <a href={boardTicketUrl(otherBoardUrl, receipt.ticket.id)} target="_blank" rel="noreferrer" className="text-sm underline">
                  Ouvrir la carte sur le board VPS
                </a>
              )}
            </div>
          )}
          {receipt?.status === "pending" && (
            <p role="status" className="rounded-md border border-border bg-muted/30 p-3 text-sm text-warning">
              Le VPS n’a pas confirmé la création{receipt.send.lastError ? ` : ${receipt.send.lastError}` : "."} L’envoi est conservé et sera réessayé automatiquement toutes les 5 minutes, sans créer de doublon.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="vps-project" className={FIELD_LABEL_CLASSES}>Projet du VPS</Label>
            {projectsError === null ? (
              <Select id="vps-project" value={project} onChange={(e) => setProjectChoice(e.target.value)} disabled={projects === null} className="w-full">
                {projects === null && <option value="">Chargement des projets du VPS…</option>}
                {projects?.length === 0 && <option value="">Aucun projet sur le VPS</option>}
                {projects?.map((candidate) => (
                  <option key={candidate.key} value={candidate.key}>
                    {candidate.label} · {VCS_PROVIDER_LABELS[candidate.vcsProvider]} · {candidate.baseBranch}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p role="alert" className="text-xs text-danger">Projets du VPS indisponibles : {projectsError}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => setLoadKey((key) => key + 1)}>Réessayer</Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vps-description" className={FIELD_LABEL_CLASSES}>Quel résultat souhaitez-vous ?</Label>
            <Textarea
              id="vps-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="min-h-48"
              placeholder="Décrivez le résultat attendu, le contexte et les critères de réussite…"
            />
            <p className="text-xs text-muted-foreground">Markdown accepté. Les images collées ne sont pas envoyées au VPS.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vps-title" className={FIELD_LABEL_CLASSES}>Titre (optionnel)</Label>
            <Input id="vps-title" value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Titre du ticket (déduit de la description si vide)" />
          </div>
          {sends.length > 0 && (
            <section className="space-y-2 rounded-md border border-border p-3">
              <h3 className="text-sm font-medium">Envois vers le VPS non confirmés ({sends.length})</h3>
              <ul className="space-y-2">
                {sends.map((send) => (
                  <li key={send.id} className="flex flex-wrap items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-medium text-foreground">{sendTitle(send)}</p>
                      <p className="text-muted-foreground">
                        {send.projectLabel ?? send.draft.project} · {SEND_STATUS_LABELS[send.status]} · {send.attempts} essai(s){send.draft.analysis === "analyze" ? " · avec analyse" : ""}
                      </p>
                      {send.lastError && <p className={send.status === "failed" ? "text-danger" : "text-warning"}>{send.lastError}</p>}
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => dismiss(send.id)}>Retirer</Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </div>
      <div className={SHEET_FOOTER_CLASSES}>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {receipt === null ? "Annuler" : "Fermer"}
        </Button>
        <SplitButton
          label={busy ? "Envoi au VPS…" : "Créer sur le VPS"}
          onClick={() => submit("none")}
          mainDisabled={submitDisabled}
          menuDisabled={submitDisabled}
          menuLabel="Autres façons de créer sur le VPS"
          open={menuOpen}
          onOpenChange={setMenuOpen}
        >
          <SplitMenuItem label="Créer le ticket" description="Reste dans « À faire » sur le VPS · action par défaut" onClick={() => submit("none")} />
          <SplitMenuItem label="Créer et analyser" description="Reste dans « À faire » et lance l’analyse automatique sur le VPS" onClick={() => submit("analyze")} />
        </SplitButton>
      </div>
    </div>
  );
}
