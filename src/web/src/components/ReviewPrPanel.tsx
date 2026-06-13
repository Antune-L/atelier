import { Check, GitPullRequest, RefreshCw } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";

import type { OpenPr, ProjectInfo } from "@shared/schemas";
import { REVIEW_DEPTHS, REVIEW_DEPTH_LABELS, type ReviewDepth } from "@shared/constants";
import { reviewDepthSchema } from "@shared/schemas";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ReviewPrPanelProps {
  projects: ProjectInfo[];
  onClose: () => void;
}

/** A PR needs attention when it is open and no review is recorded yet (or one is required). */
function needsAttention(pr: OpenPr): boolean {
  return !pr.isDraft && (pr.reviewDecision === "" || pr.reviewDecision === "REVIEW_REQUIRED");
}

export function ReviewPrPanel({ projects, onClose }: ReviewPrPanelProps) {
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const project = projectChoice ?? projects[0]?.key ?? "";
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [prs, setPrs] = useState<OpenPr[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [depth, setDepth] = useState<ReviewDepth>("light");
  const [postComments, setPostComments] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (key: string): Promise<void> => {
    try {
      const data = await api.projectPrs(key);
      setPrs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du chargement des PRs");
      setPrs([]);
    }
  }, []);

  const refresh = (): void => {
    setPrs(null);
    setError(null);
    setSelected(new Set());
    void load(project);
  };

  // Load PRs for the active project on first render and on each project change (no useEffect).
  if (project && project !== loadedKey) {
    setLoadedKey(project);
    setPrs(null);
    setError(null);
    setSelected(new Set());
    void load(project);
  }

  const loading = prs === null && error === null;

  const toggle = (n: number): void =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const launch = async (): Promise<void> => {
    if (selected.size === 0 || !prs) return;
    setBusy(true);
    setError(null);
    try {
      const chosen = prs.filter((p) => selected.has(p.number));
      await api.createReviews({ project, depth, postComments, prs: chosen });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du lancement de la revue");
    } finally {
      setBusy(false);
    }
  };

  let list: ReactNode;
  if (loading) {
    list = <p className="text-sm text-muted-foreground">Chargement des PRs…</p>;
  } else if (prs && prs.length > 0) {
    list = (
      <div className="space-y-1.5">
        {prs.map((pr) => (
          <PrRow key={pr.number} pr={pr} selected={selected.has(pr.number)} onToggle={() => toggle(pr.number)} />
        ))}
      </div>
    );
  } else {
    list = <p className="text-sm text-muted-foreground">Aucune PR ouverte sur ce projet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="review-project">Projet</Label>
          <Select
            id="review-project"
            value={project}
            onChange={(e) => setProjectChoice(e.target.value)}
            className="w-full"
          >
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading} aria-label="Rafraîchir les PRs">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="max-h-[320px] overflow-y-auto">{list}</div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="review-depth">Profondeur</Label>
          <Select
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
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={postComments} onCheckedChange={setPostComments} aria-label="Poster sur GitHub" />
          <span>Poster les commentaires sur GitHub</span>
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={launch} disabled={busy || selected.size === 0}>
          <GitPullRequest className="h-4 w-4" />
          Lancer la revue{selected.size > 0 ? ` (${selected.size})` : ""}
        </Button>
      </div>
    </div>
  );
}

interface PrRowProps {
  pr: OpenPr;
  selected: boolean;
  onToggle: () => void;
}

function PrRow({ pr, selected, onToggle }: PrRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border p-2.5 text-left transition-colors hover:border-ring",
        selected && "border-primary bg-primary/5",
        needsAttention(pr) && !selected && "border-warning/50 bg-warning/5",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{pr.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">#{pr.number}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">{pr.headBranch}</span>
          <span>· {pr.author}</span>
          <span className="text-success">+{pr.additions}</span>
          <span className="text-destructive">-{pr.deletions}</span>
          {needsAttention(pr) && <Badge variant="warning">À reviewer</Badge>}
          {pr.isDraft && <Badge variant="secondary">Draft</Badge>}
        </div>
      </div>
    </button>
  );
}
