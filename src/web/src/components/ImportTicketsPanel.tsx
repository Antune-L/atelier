import { ChevronDown, ChevronRight, Copy, FileUp, Upload } from "lucide-react";
import { useRef, useState } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { ImplementationSettings } from "@/components/ImplementationSettings";
import { ProjectSelect } from "@/components/ProjectSelect";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAgentKnobs } from "@/hooks/useAgentKnobs";
import { api } from "@/lib/api";
import { FIELD_LABEL_CLASSES, PANEL_FOOTER_CLASSES } from "@/lib/overlayStyles";
import { parseTicketsCsv, type ParsedTicketRow, type ParsedTicketsCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { resolveProjectChoice } from "@/lib/projectSelection";

interface ImportTicketsPanelProps {
  projects: ProjectInfo[];
  onClose: () => void;
}

/** Copyable formatting prompt for an LLM to convert any source into the expected CSV (no source placeholder). */
const FORMATTING_PROMPT = `Tu es un assistant qui convertit une liste de tâches (texte libre, export Trello, tableau, etc.) en CSV pour un outil de tickets.
Règles :
- Sortie : uniquement un CSV valide (RFC-4180), rien d'autre.
- Première ligne = en-tête exacte : title,description
- 1 ligne par ticket. title = titre court et explicite (obligatoire). description = tout le reste : contexte, critères d'acceptation, liens, et chemins/URL d'images ou captures.
- Mets entre guillemets tout champ contenant une virgule, un retour à la ligne ou un guillemet ; double les guillemets internes (" → "").
- N'invente pas de contenu : si une info manque, ne la fabrique pas.
- Si une carte référence une pièce jointe non publique (ex. lien Trello), garde le lien tel quel dans description.`;

/** How long the "Copié" confirmation stays visible after copying the prompt. */
const COPY_FEEDBACK_MS = 1500;

export function ImportTicketsPanel({
  projects,
  onClose,
}: ImportTicketsPanelProps) {
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const project = resolveProjectChoice(projects, projectChoice);

  const [promptOpen, setPromptOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedTicketsCsv | null>(null);
  const [excludedLines, setExcludedLines] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileReadRequest = useRef(0);

  // Batch options (applied to every imported ticket); null = fall back to project/server defaults.
  const [prdEnabled, setPrdEnabled] = useState(false);
  const agent = useAgentKnobs();
  const [runFeasibility, setRunFeasibility] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasErrors = (parsed?.errors.length ?? 0) > 0;
  const validRows = parsed?.rows ?? [];
  const importRows = validRows.filter((row) => !excludedLines.has(row.line));
  const hasEmptyTitle = importRows.some((row) => !row.title.trim());
  const canImport = !busy && !!project && importRows.length > 0 && !hasErrors && !hasEmptyTitle;
  // The feasibility toggle is only meaningful once the CSV parses cleanly.
  const feasibilityDisabled = hasErrors || importRows.length === 0 || hasEmptyTitle;

  const copyPrompt = (): void => {
    void navigator.clipboard.writeText(FORMATTING_PROMPT).then(() => {
      setPromptCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(
        () => setPromptCopied(false),
        COPY_FEEDBACK_MS,
      );
    });
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    const requestId = ++fileReadRequest.current;
    setFileName(file.name);
    setError(null);
    setParsed(null);
    setExcludedLines(new Set());
    void file
      .text()
      .then((text) => {
        if (requestId !== fileReadRequest.current) return;
        const result = parseTicketsCsv(text);
        setParsed(result);
        setExcludedLines(new Set());
        // Cleared CSV can no longer support feasibility: keep the toggle honest.
        if (result.errors.length > 0 || result.rows.length === 0)
          setRunFeasibility(false);
      })
      .catch(() => {
        if (requestId === fileReadRequest.current) setError("Lecture du fichier impossible.");
      });
  };

  const updateRow = (line: number, changes: Partial<Pick<ParsedTicketRow, "title" | "description">>): void => {
    setParsed((previous) => {
      if (previous === null) return previous;
      return { ...previous, rows: previous.rows.map((row) => row.line === line ? { ...row, ...changes } : row) };
    });
  };

  const submit = async (): Promise<void> => {
    if (!canImport || !parsed) return;
    setBusy(true);
    setError(null);
    try {
      await api.importTickets({
        project,
        rows: importRows.map((row) => ({
          title: row.title,
          description: row.description,
        })),
        prdEnabled,
        // These exec settings are not exposed in the import panel: fall back to safe defaults for imported tickets.
        prDraft: true,
        autoMerge: false,
        stealth: false,
        directPush: false,
        addScreenshots: false,
        verifyFeature: false,
        argusMultiLoop: false,
        // No base-branch control in the import panel: always fall back to the project default.
        baseBranch: null,
        orchestrator: agent.orchestrator,
        model: agent.model,
        effort: agent.effort,
        implementerModel: agent.implementerModel,
        implementerEffort: agent.implementerEffort,
        implementer: agent.implementer,
        codexModel: agent.codexModel,
        codexEffort: agent.codexEffort,
        codexFast: agent.codexFast,
        codexImplementerModel: agent.codexImplementerModel,
        codexImplementerEffort: agent.codexImplementerEffort,
        codexImplementerFast: agent.codexImplementerFast,
        runFeasibility: runFeasibility && !feasibilityDisabled,
        feasibilityEngine: null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'import.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <ProjectSelect
            id="import-project"
            projects={projects}
            value={project}
            onChange={setProjectChoice}
          />

          <div className="space-y-1.5">
            <Label htmlFor="import-file" className={FIELD_LABEL_CLASSES}>Fichier CSV</Label>
            <input
              ref={fileInputRef}
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={onFileChange}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full justify-start"
            >
              <FileUp className="h-4 w-4" />
              {fileName ?? "Choisir un fichier .csv"}
            </Button>
          </div>

          {parsed && (
            <div className="space-y-2">
              {hasErrors ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm">
                  <p className="font-semibold text-destructive">
                    {parsed.errors.length} erreur(s) — corrige le CSV à la source
                    avant d'importer.
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-destructive">
                    {parsed.errors.map((err, i) => (
                      <li key={`${err.line}-${i}`}>{err.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-success">
                  {validRows.length} carte(s) reconnue(s) dans le CSV. Vérifiez leur contenu avant import.
                </p>
              )}
              {parsed.warnings.map((warning) => (
                <p key={warning} className="text-xs text-warning">
                  {warning}
                </p>
              ))}
              {validRows.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-medium">Aperçu des cartes · {importRows.length} sélectionnée(s)</h3>
                  <p className="text-xs text-muted-foreground">Sélectionnez les cartes à importer. Ouvrez une carte pour modifier son titre et sa description avant création.</p>
                  <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain rounded-md border border-border p-2">
                    {validRows.map((row) => (
                      <article key={row.line} className="rounded-md border border-border p-3">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input type="checkbox" checked={!excludedLines.has(row.line)} onChange={(event) => {
                            const included = event.target.checked;
                            setExcludedLines((previous) => {
                              const next = new Set(previous);
                              if (included) next.delete(row.line);
                              else next.add(row.line);
                              return next;
                            });
                          }} />
                          Importer la carte de la ligne {row.line}
                        </label>
                        <details className="mt-2">
                          <summary className="cursor-pointer break-words text-sm font-medium">{row.title || "Titre à renseigner"}</summary>
                          <div className="mt-3 space-y-3">
                            <div className="space-y-1.5">
                              <Label htmlFor={`import-title-${row.line}`}>Titre de la carte</Label>
                              <Input id={`import-title-${row.line}`} value={row.title} onChange={(event) => updateRow(row.line, { title: event.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`import-description-${row.line}`}>Description de la carte</Label>
                              <Textarea id={`import-description-${row.line}`} value={row.description} onChange={(event) => updateRow(row.line, { description: event.target.value })} rows={3} />
                            </div>
                          </div>
                        </details>
                      </article>
                    ))}
                  </div>
                  {hasEmptyTitle && <p role="alert" className="text-xs text-danger">Chaque carte sélectionnée doit avoir un titre.</p>}
                </section>
              )}
            </div>
          )}

        </div>
        <aside className="space-y-4 md:w-72 md:shrink-0">
          <div className="rounded-md border border-border">
            <div className="flex items-center justify-between px-3 py-2 text-sm font-medium">
              <button
                type="button"
                onClick={() => setPromptOpen((open) => !open)}
                aria-expanded={promptOpen}
                aria-controls="import-formatting-rules"
                className="flex flex-1 items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {promptOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Règles de mise en forme du CSV
              </button>
              <button
                type="button"
                onClick={copyPrompt}
                className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
              >
                <Copy className="h-3.5 w-3.5" />
                {promptCopied ? "Copié" : "Copier"}
              </button>
            </div>
            {promptOpen && (
              <pre id="import-formatting-rules" className="max-h-64 overflow-auto whitespace-pre-wrap border-t px-3 py-2 text-xs text-muted-foreground">
                {FORMATTING_PROMPT}
              </pre>
            )}
          </div>

          <ImplementationSettings agent={agent} />

          <label className="flex items-center justify-between gap-2 text-sm">
            <span>Préparer un plan (PRD) pour chaque carte</span>
            <Switch
              checked={prdEnabled}
              onCheckedChange={setPrdEnabled}
              aria-label="PRD"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>
              Analyse de faisabilité optionnelle
              {feasibilityDisabled && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (sélectionnez des cartes avec un titre, sans erreur CSV)
                </span>
              )}
            </span>
            <Switch
              checked={runFeasibility && !feasibilityDisabled}
              disabled={feasibilityDisabled}
              onCheckedChange={setRunFeasibility}
              aria-label="Analyser la faisabilité"
            />
          </label>

          <section className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
            <h3 className="text-sm font-medium">Résumé de l’import</h3>
            <p className="text-xs text-muted-foreground">{importRows.length} carte(s) dans {projects.find((candidate) => candidate.key === project)?.label ?? "le projet à choisir"}. {prdEnabled ? "Plan préalable demandé." : "Sans plan préalable."} {runFeasibility && !feasibilityDisabled ? "Analyse de faisabilité demandée." : "Analyse de faisabilité désactivée."}</p>
            <p className="text-xs text-muted-foreground">Les cartes seront créées sans lancer leur implémentation. Livraison prévue : pull request brouillon, sans fusion automatique.</p>
          </section>

        </aside>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className={PANEL_FOOTER_CLASSES}>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button
          size="sm"
          onClick={() => void submit()}
          disabled={!canImport}
          className={cn(!canImport && "opacity-60")}
        >
          <Upload className="h-4 w-4" />
          {runFeasibility && !feasibilityDisabled
            ? `Importer et analyser (${importRows.length})`
            : `Importer (${importRows.length})`}
        </Button>
      </div>
    </div>
  );
}
