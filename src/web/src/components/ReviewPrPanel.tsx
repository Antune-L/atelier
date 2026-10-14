import { GitPullRequest } from "lucide-react";
import { useRef, useState } from "react";

import {
  COMMIT_LANGUAGES,
  COMMIT_LANGUAGE_LABELS,
  DEFAULT_COMMIT_LANGUAGE,
  REVIEW_DEPTHS,
  REVIEW_DEPTH_LABELS,
  type AgentEffort,
  type AgentModel,
  type CodexEffort,
  type CodexModel,
  type CommitLanguage,
  type Orchestrator,
  type ReviewDepth,
} from "@shared/constants";
import type { PrNotification, PrNotificationReviewOptions, ProjectInfo } from "@shared/schemas";
import { commitLanguageSchema, reviewDepthSchema } from "@shared/schemas";

import { ProjectPrPicker } from "@/components/ProjectPrPicker";
import { ToolAgentSettings } from "@/components/ToolAgentSettings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useProjectPanel } from "@/hooks/useProjectPanel";
import { refreshReviewCounts, useReviewCounts } from "@/hooks/useReviewCounts";
import { api } from "@/lib/api";
import { FIELD_LABEL_CLASSES, PANEL_FOOTER_CLASSES } from "@/lib/overlayStyles";

interface ReviewPrPanelProps {
  projects: ProjectInfo[];
  onClose: () => void;
  notification?: PrNotification;
}

/** Sentinel value for the "Auto" base-branch option (no override → each PR's own detected target). */
const BASE_BRANCH_AUTO = "";

export function ReviewPrPanel({ projects, onClose, notification }: ReviewPrPanelProps) {
  const panel = useProjectPanel(notification ? [] : projects);
  const reviewCounts = useReviewCounts();
  const capabilities = useCapabilities();
  const { settings } = useAppSettings();
  const { prs, selected, error, setError, busy, setBusy } = panel;
  const project = notification?.project ?? panel.project;
  const selectedCount = notification ? 1 : selected.size;
  const [depth, setDepth] = useState<ReviewDepth>("full");
  const [fixComments, setFixComments] = useState(false);
  const [language, setLanguage] = useState<CommitLanguage | null>(null);
  const [humanTone, setHumanTone] = useState(false);
  const resolvedLanguage = language ?? settings?.commitLanguage ?? DEFAULT_COMMIT_LANGUAGE;
  // null = follow the server default; resolve it so the matching tab is highlighted.
  const [model, setModel] = useState<AgentModel | null>(null);
  const [effort, setEffort] = useState<AgentEffort | null>(null);
  const [orchestrator, setOrchestrator] = useState<Orchestrator>("claude");
  const [codexModel, setCodexModel] = useState<CodexModel | null>(null);
  const [codexEffort, setCodexEffort] = useState<CodexEffort | null>(null);
  const [codexFastOverride, setCodexFast] = useState<boolean | null>(null);
  // "" (BASE_BRANCH_AUTO) = no override → argus uses each PR's own detected target branch.
  const [baseBranch, setBaseBranch] = useState<string>(BASE_BRANCH_AUTO);
  const [branches, setBranches] = useState<string[] | null>(null);
  const [branchesKey, setBranchesKey] = useState<string | null>(null);
  const codexFast = codexFastOverride ?? capabilities.defaultCodexFast;
  // Tracks the latest requested project so an out-of-order branch fetch is dropped.
  const latestBranchKey = useRef<string | null>(null);
  const launching = useRef(false);

  // Load the project's branches for the override picker on first render and on each
  // project change (mirrors the no-useEffect load-on-render pattern).
  if (project && project !== branchesKey) {
    const key = project;
    latestBranchKey.current = key;
    setBranchesKey(key);
    setBranches(null);
    setBaseBranch(BASE_BRANCH_AUTO);
    void api
      .projectBranches(key)
      .then((list) => latestBranchKey.current === key && setBranches(list))
      .catch(() => latestBranchKey.current === key && setBranches([]));
  }

  const launch = async (): Promise<void> => {
    if (launching.current || (!notification && (selected.size === 0 || !prs))) return;
    launching.current = true;
    setBusy(true);
    setError(null);
    try {
      const options: PrNotificationReviewOptions = {
        depth,
        postComments: true,
        fixComments,
        language: resolvedLanguage,
        humanTone,
        baseBranch: baseBranch === BASE_BRANCH_AUTO ? null : baseBranch,
        model,
        effort,
        orchestrator,
        codexModel,
        codexEffort,
        codexFast,
      };
      if (notification) {
        await api.createPrNotificationReview(notification.id, options);
      } else {
        await api.createReviews({ ...options, project, prs: (prs ?? []).filter((pr) => selected.has(pr.number)) });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du lancement de la revue");
    } finally {
      launching.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {notification ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">#{notification.prNumber} · {notification.title}</p>
          <p className="text-xs text-muted-foreground">Les options s’appliquent à la nouvelle review. Si une review est déjà en cours, elle sera ouverte avec ses réglages actuels.</p>
        </div>
      ) : <ProjectPrPicker
        projects={projects}
        panel={panel}
        idPrefix="review"
        reviewCounts={reviewCounts}
        onRefreshCounts={() => { void refreshReviewCounts(); }}
      />}

      <section className="space-y-3 rounded-md border border-border p-3">
        <h3 className="text-sm font-medium">Langue et ton des commentaires</h3>
        <div className="space-y-1.5">
          <Label htmlFor="review-language" className={FIELD_LABEL_CLASSES}>Langue des commentaires</Label>
          <Select
            className="w-full"
            id="review-language"
            value={resolvedLanguage}
            onChange={(e) => setLanguage(commitLanguageSchema.parse(e.target.value))}
          >
            {COMMIT_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {COMMIT_LANGUAGE_LABELS[l]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Switch checked={humanTone} onCheckedChange={setHumanTone} aria-labelledby="human-tone-label" />
            <span id="human-tone-label" className="text-sm">Commentaires plus humains</span>
          </div>
          <p className="pl-11 text-xs text-muted-foreground">
            Ton de collègue : remarques courtes et directes, sans jargon de reviewer.
          </p>
        </div>

      </section>

      <section className="space-y-2 rounded-md border border-border p-3">
        <h3 className="text-sm font-medium">Périmètre de la relecture</h3>
        <p className="text-xs text-muted-foreground">{REVIEW_DEPTH_LABELS[depth]} · Cible : {baseBranch || "branche cible de chaque PR"}</p>
        <details>
          <summary className="cursor-pointer text-xs font-medium text-primary">Modifier le périmètre et la branche cible</summary>
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="review-depth" className={FIELD_LABEL_CLASSES}>Niveau de relecture</Label>
              <Select
                className="w-full"
                id="review-depth"
                value={depth}
                onChange={(e) => setDepth(reviewDepthSchema.parse(e.target.value))}
              >
                {REVIEW_DEPTHS.map((d) => (
                  <option key={d} value={d}>
                    {REVIEW_DEPTH_LABELS[d]}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="review-base-branch" className={FIELD_LABEL_CLASSES}>Branche cible de la relecture</Label>
              <Select
                className="w-full"
                id="review-base-branch"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                disabled={branches === null}
              >
                <option value={BASE_BRANCH_AUTO}>Auto — cible réelle de chaque PR</option>
                {(branches ?? []).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>

          </div>
        </details>
      </section>

      <ToolAgentSettings
        id="review"
        model={model}
        effort={effort}
        onModelChange={setModel}
        onEffortChange={setEffort}
        orchestrator={orchestrator}
        codexModel={codexModel}
        codexEffort={codexEffort}
        codexFast={codexFast}
        onOrchestratorChange={setOrchestrator}
        onCodexModelChange={setCodexModel}
        onCodexEffortChange={setCodexEffort}
        onCodexFastChange={setCodexFast}
      />

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Switch checked={fixComments} onCheckedChange={setFixComments} aria-labelledby="fix-comments-label" />
          <span id="fix-comments-label" className="text-sm">Corriger les retours directement sur la PR</span>
        </div>
        <p className="pl-11 text-xs text-muted-foreground">
          Un sous-agent applique les corrections puis pousse sur la branche de la PR.
        </p>
      </div>

      <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
        <p className="text-sm font-medium">Publication sur {selectedCount} PR sélectionnée(s)</p>
        <p className="text-xs text-muted-foreground">Les commentaires et le verdict seront publiés sur les PR du projet. Langue : {COMMIT_LANGUAGE_LABELS[resolvedLanguage]}. Ton : {humanTone ? "collègue, court et direct" : "standard"}.</p>
        <p className="text-xs text-muted-foreground">{fixComments ? "Les corrections pertinentes seront appliquées puis poussées sur la branche de la PR." : "Relecture seule : les branches des PR ne seront pas modifiées."}</p>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className={PANEL_FOOTER_CLASSES}>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button size="sm" onClick={launch} disabled={busy || selectedCount === 0}>
          <GitPullRequest className="h-4 w-4" />
          Lancer la relecture{selectedCount > 0 ? ` (${selectedCount})` : ""}
        </Button>
      </div>
    </div>
  );
}
