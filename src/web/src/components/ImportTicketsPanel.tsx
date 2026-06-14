import { ChevronDown, ChevronRight, Copy, FileUp, Upload } from "lucide-react";
import { useRef, useState } from "react";

import type { ProjectInfo } from "@shared/schemas";
import type { AgentEffort, AgentModel, Implementer } from "@shared/constants";

import { AgentProfileConfig } from "@/components/AgentProfileConfig";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { parseTicketsCsv, type ParsedTicketsCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

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

/** Chars of a row's description shown in the preview table. */
const PREVIEW_DESC_MAX = 80;
/** How long the "Copié" confirmation stays visible after copying the prompt. */
const COPY_FEEDBACK_MS = 1500;

export function ImportTicketsPanel({ projects, onClose }: ImportTicketsPanelProps) {
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const project = projectChoice ?? projects[0]?.key ?? "";
  const selectedProject = projects.find((p) => p.key === project);

  const [promptOpen, setPromptOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedTicketsCsv | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Batch options (applied to every imported ticket); null = fall back to project/server defaults.
  const [prdEnabled, setPrdEnabled] = useState(false);
  const [prDraft, setPrDraft] = useState(true);
  const [autoMergeChoice, setAutoMergeChoice] = useState<boolean | null>(null);
  const autoMerge = autoMergeChoice ?? selectedProject?.defaultAutoMerge ?? false;
  const addScreenshots = !autoMerge && (selectedProject?.defaultAddScreenshots ?? false);
  const [verifyFeature, setVerifyFeature] = useState(false);
  const [model, setModel] = useState<AgentModel | null>(null);
  const [effort, setEffort] = useState<AgentEffort | null>(null);
  const [implementerModel, setImplementerModel] = useState<AgentModel | null>(null);
  const [implementerEffort, setImplementerEffort] = useState<AgentEffort | null>(null);
  const [implementer, setImplementer] = useState<Implementer>("claude");
  const [runFeasibility, setRunFeasibility] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyProfile = (config: {
    model: AgentModel;
    effort: AgentEffort;
    implementerModel: AgentModel;
    implementerEffort: AgentEffort;
    implementer: Implementer;
  }): void => {
    setModel(config.model);
    setEffort(config.effort);
    setImplementerModel(config.implementerModel);
    setImplementerEffort(config.implementerEffort);
    setImplementer(config.implementer);
  };

  const hasErrors = (parsed?.errors.length ?? 0) > 0;
  const validRows = parsed?.rows ?? [];
  const canImport = !busy && !!project && validRows.length > 0 && !hasErrors;
  // The feasibility toggle is only meaningful once the CSV parses cleanly.
  const feasibilityDisabled = hasErrors || validRows.length === 0;

  const copyPrompt = (): void => {
    void navigator.clipboard.writeText(FORMATTING_PROMPT).then(() => {
      setPromptCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setPromptCopied(false), COPY_FEEDBACK_MS);
    });
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    void file
      .text()
      .then((text) => {
        const result = parseTicketsCsv(text);
        setParsed(result);
        // Cleared CSV can no longer support feasibility: keep the toggle honest.
        if (result.errors.length > 0 || result.rows.length === 0) setRunFeasibility(false);
      })
      .catch(() => setError("Lecture du fichier impossible."));
  };

  const submit = async (): Promise<void> => {
    if (!canImport || !parsed) return;
    setBusy(true);
    setError(null);
    try {
      await api.importTickets({
        project,
        rows: parsed.rows.map((row) => ({ title: row.title, description: row.description })),
        prdEnabled,
        prDraft,
        autoMerge,
        addScreenshots,
        verifyFeature,
        // No base-branch control in the import panel: always fall back to the project default.
        baseBranch: null,
        model,
        effort,
        implementerModel,
        implementerEffort,
        implementer,
        runFeasibility: runFeasibility && !feasibilityDisabled,
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
      <div className="space-y-1.5">
        <Label htmlFor="import-project">Projet</Label>
        <Select
          id="import-project"
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

      <div className="rounded-md border">
        <div className="flex items-center justify-between px-3 py-2 text-sm font-medium">
          <button
            type="button"
            onClick={() => setPromptOpen((open) => !open)}
            className="flex flex-1 items-center gap-1.5"
          >
            {promptOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Prompt de mise en forme CSV
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
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap border-t px-3 py-2 text-xs text-muted-foreground">
            {FORMATTING_PROMPT}
          </pre>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="import-file">Fichier CSV</Label>
        <input
          ref={fileInputRef}
          id="import-file"
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="hidden"
        />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full justify-start">
          <FileUp className="h-4 w-4" />
          {fileName ?? "Choisir un fichier .csv"}
        </Button>
      </div>

      {parsed && (
        <div className="space-y-2">
          {hasErrors ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm">
              <p className="font-semibold text-destructive">
                {parsed.errors.length} erreur(s) — corrige le CSV à la source avant d'importer.
              </p>
              <ul className="mt-1 list-disc pl-5 text-destructive">
                {parsed.errors.map((err, i) => (
                  <li key={`${err.line}-${i}`}>{err.message}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-emerald-600">
              {validRows.length} ticket(s) valide(s) détecté(s), 0 erreur.
            </p>
          )}
          {parsed.warnings.map((warning) => (
            <p key={warning} className="text-xs text-amber-600">
              {warning}
            </p>
          ))}
          {validRows.length > 0 && (
            <div className="max-h-48 overflow-auto rounded-md border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-2 py-1">#</th>
                    <th className="px-2 py-1">Titre</th>
                    <th className="px-2 py-1">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.map((row) => (
                    <tr key={row.line} className="border-t">
                      <td className="px-2 py-1 text-muted-foreground">{row.line}</td>
                      <td className="px-2 py-1">{row.title}</td>
                      <td className="px-2 py-1 text-muted-foreground">
                        {row.description.slice(0, PREVIEW_DESC_MAX)}
                        {row.description.length > PREVIEW_DESC_MAX ? "…" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <h3 className="text-sm font-semibold">Agent d'implémentation (tout le lot)</h3>
        <AgentProfileConfig
          model={model}
          effort={effort}
          implementerModel={implementerModel}
          implementerEffort={implementerEffort}
          implementer={implementer}
          onModelChange={setModel}
          onEffortChange={setEffort}
          onImplementerModelChange={setImplementerModel}
          onImplementerEffortChange={setImplementerEffort}
          onImplementerChange={setImplementer}
          onApplyProfile={applyProfile}
        />
      </div>

      <label className="flex items-center justify-between gap-2 text-sm">
        <span>PRD à implémenter (planification avant code)</span>
        <Switch checked={prdEnabled} onCheckedChange={setPrdEnabled} aria-label="PRD à implémenter" />
      </label>
      <label className="flex items-center justify-between gap-2 text-sm">
        <span>
          Ouvrir la PR en draft
          {autoMerge && (
            <span className="ml-1 text-xs text-muted-foreground">(forcé non-draft pour le merge auto)</span>
          )}
        </span>
        <Switch
          checked={prDraft && !autoMerge}
          disabled={autoMerge}
          onCheckedChange={setPrDraft}
          aria-label="Ouvrir la PR en draft"
        />
      </label>
      <label className="flex items-center justify-between gap-2 text-sm">
        <span>Merger automatiquement la PR après ouverture</span>
        <Switch checked={autoMerge} onCheckedChange={setAutoMergeChoice} aria-label="Merge automatique de la PR" />
      </label>
      <label className="flex items-center justify-between gap-2 text-sm">
        <span>Tester que la feature marche avant la PR (+ comparaison visuelle aux maquettes)</span>
        <Switch checked={verifyFeature} onCheckedChange={setVerifyFeature} aria-label="Tester la feature avant la PR" />
      </label>
      <label className="flex items-center justify-between gap-2 text-sm">
        <span>
          Analyser la faisabilité de chaque ticket
          {feasibilityDisabled && (
            <span className="ml-1 text-xs text-muted-foreground">(importe un CSV sans erreur d'abord)</span>
          )}
        </span>
        <Switch
          checked={runFeasibility && !feasibilityDisabled}
          disabled={feasibilityDisabled}
          onCheckedChange={setRunFeasibility}
          aria-label="Analyser la faisabilité"
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={() => void submit()} disabled={!canImport} className={cn(!canImport && "opacity-60")}>
          <Upload className="h-4 w-4" />
          {runFeasibility && !feasibilityDisabled
            ? `Importer et analyser (${validRows.length})`
            : `Importer (${validRows.length})`}
        </Button>
      </div>
    </div>
  );
}
