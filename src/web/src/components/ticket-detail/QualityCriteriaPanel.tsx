import { ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { ORCHESTRATOR_LABELS } from "@shared/constants";
import { QUALITY_MAX_OBSERVATION_LENGTH, setQualityCriteriaSchema } from "@shared/quality";
import type { ManualQualityEvidenceInput, QualityCriteriaSnapshot, QualityCriterion, QualityEvidence, QualityGate, TicketQuality } from "@shared/quality";

import { QualityResult, QualitySection, evidenceProvenance } from "@/components/ticket-detail/QualityResults";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatQualityCriterionText, qualityErrorMessage, qualityModeLabel } from "@/lib/qualityMessages";

const SOURCE_LABELS: Record<QualityCriterion["source"], string> = { ticket: "Ticket", prd: "PRD", user: "Utilisateur" };
const CREATOR_LABELS: Record<QualityCriteriaSnapshot["createdBy"], string> = { user: "Définis par vous", agent: "Préparés par le validateur", system: "Préparés par Atelier" };

interface QualityCriteriaPanelProps {
  quality: TicketQuality;
  gate: QualityGate;
  busy: boolean;
  onSave: (criteria: QualityCriterion[]) => Promise<void>;
  onEvidence: (input: ManualQualityEvidenceInput) => Promise<void>;
  onOpenEvidence: (evidence: QualityEvidence) => void;
}

function newCriterion(): QualityCriterion {
  return { id: crypto.randomUUID(), text: "", source: "user", required: true, independent: true };
}

function CriteriaEditor({ snapshot, busy, onSave, onClose }: { snapshot: QualityCriteriaSnapshot | undefined; busy: boolean; onSave: QualityCriteriaPanelProps["onSave"]; onClose: () => void }) {
  const [criteria, setCriteria] = useState<QualityCriterion[]>(snapshot?.criteria ?? [newCriterion()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const valid = setQualityCriteriaSchema.safeParse({ criteria }).success;
  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      await onSave(setQualityCriteriaSchema.parse({ criteria }).criteria);
      onClose();
    } catch (failure) {
      setError(qualityErrorMessage(failure));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} title="Critères d’acceptation" description="Chaque enregistrement crée une nouvelle version. Les preuves précédentes restent consultables." footer={<><Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" disabled={!valid || saving || busy} onClick={() => void save()}>Enregistrer les critères</Button></>}>
      <div className="space-y-3">
        {criteria.map((criterion, index) => (
          <div key={criterion.id} className="space-y-2 rounded border border-border p-3">
            <div className="flex items-center justify-between"><label htmlFor={`criterion-${criterion.id}`} className="text-xs font-medium">Critère {index + 1}</label><Button variant="ghost" size="sm" aria-label={`Supprimer le critère ${index + 1}`} onClick={() => setCriteria((current) => current.filter((item) => item.id !== criterion.id))}><Trash2 className="h-3.5 w-3.5" /></Button></div>
            <Textarea id={`criterion-${criterion.id}`} value={criterion.text} onChange={(event) => setCriteria((current) => current.map((item) => item.id === criterion.id ? { ...item, text: event.target.value, source: "user" } : item))} />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={criterion.required} onChange={(event) => setCriteria((current) => current.map((item) => item.id === criterion.id ? { ...item, required: event.target.checked } : item))} />Requis pour la livraison complète</label>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setCriteria((current) => [...current, newCriterion()])}><Plus className="h-3.5 w-3.5" />Ajouter un critère</Button>
        {error !== null && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    </Dialog>
  );
}

function HumanEvidenceEditor({ criterion, onSave, onClose }: { criterion: QualityCriterion; onSave: QualityCriteriaPanelProps["onEvidence"]; onClose: () => void }) {
  const [observation, setObservation] = useState("");
  const [status, setStatus] = useState<ManualQualityEvidenceInput["status"]>("inconclusive");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ criterionId: criterion.id, observation, status });
      onClose();
    } catch (failure) {
      setError(qualityErrorMessage(failure));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }} title="Ajouter une observation humaine" description={criterion.text} footer={<><Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button><Button size="sm" disabled={saving || observation.trim() === ""} onClick={() => void save()}>Enregistrer l’observation</Button></>}>
      <label htmlFor="quality-human-observation" className="block text-xs font-medium">Vérifications effectuées et résultat observé</label>
      <Textarea id="quality-human-observation" maxLength={QUALITY_MAX_OBSERVATION_LENGTH} value={observation} onChange={(event) => setObservation(event.target.value)} />
      <label htmlFor="quality-human-result" className="block text-xs font-medium">Résultat de l’observation</label>
      <Select id="quality-human-result" value={status} onChange={(event) => { if (event.target.value === "passed" || event.target.value === "failed" || event.target.value === "inconclusive") setStatus(event.target.value); }}><option value="inconclusive">Non concluant</option><option value="passed">Résultat observé conforme</option><option value="failed">Échec observé</option></Select>
      <p className="text-xs text-muted-foreground">Cette observation est identifiée comme humaine. Elle ne remplace pas la validation par un agent indépendant.</p>
      {error !== null && <p role="alert" className="text-xs text-danger">{error}</p>}
    </Dialog>
  );
}

export function QualityCriteriaPanel({ quality, gate, busy, onSave, onEvidence, onOpenEvidence }: QualityCriteriaPanelProps) {
  const snapshot = quality.criteriaSnapshots.at(-1);
  const [editing, setEditing] = useState(false);
  const [observing, setObserving] = useState<QualityCriterion | null>(null);
  const planner = quality.runs.find((run) => run.criteriaSnapshotId === snapshot?.id && run.kind === "full" && run.provider !== null);
  let provenance = snapshot === undefined ? "" : CREATOR_LABELS[snapshot.createdBy];
  if (snapshot?.createdBy === "agent" && planner?.provider !== null && planner?.provider !== undefined) provenance = `Préparés par ${ORCHESTRATOR_LABELS[planner.provider]}`;
  return (
    <QualitySection number={3} title="Critères d’acceptation" action={<Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(true)}>{snapshot === undefined ? "Définir les critères" : "Modifier les critères"}</Button>}>
      {snapshot === undefined ? <div className="rounded border border-border p-3 text-xs text-muted-foreground">Les critères seront préparés automatiquement depuis le ticket lorsque vous lancerez sa vérification. Vous pouvez aussi les définir manuellement.</div> : (
        <>
          <p className="text-xs text-muted-foreground">{provenance} · {qualityModeLabel(snapshot.mode)} · version {snapshot.version}</p>
          <div className="rounded border border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 font-mono text-2xs text-muted-foreground"><span>CRITÈRE · PREUVE · VERSION {snapshot.version}</span><span>{gate.verifiedCriteria.length} / {gate.requiredCriteria.length} requis vérifiés</span></div>
            <div className="divide-y divide-border">
              {snapshot.criteria.map((criterion, index) => {
                const evidence = quality.evidence.filter((item) => item.criterionId === criterion.id).at(-1);
                const run = quality.runs.find((item) => item.id === evidence?.runId);
                const evidenceCurrent = run !== undefined && gate.currentRunIds.includes(run.id);
                const verified = gate.verifiedCriteria.includes(criterion.id);
                return (
                  <div key={criterion.id} className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0 space-y-1"><p className="text-xs">{formatQualityCriterionText(criterion, snapshot.createdBy)}</p><p className="flex flex-wrap items-center gap-1 text-2xs text-muted-foreground"><FileText className="h-3 w-3" />{SOURCE_LABELS[criterion.source]} · critère {index + 1} · {criterion.required ? "requis" : "facultatif"}</p></div><QualityResult status={verified ? "passed" : "unverified"} /></div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      {evidence === undefined ? <span className="text-2xs text-muted-foreground">Aucune preuve enregistrée</span> : <button type="button" className="flex min-w-0 items-center gap-1 text-left text-2xs text-muted-foreground hover:text-foreground" onClick={() => onOpenEvidence(evidence)}>{evidenceProvenance(evidence, run)}{!evidenceCurrent && " · preuve obsolète"}<ChevronRight className="h-3 w-3 shrink-0" /></button>}
                      <button type="button" disabled={busy} className="text-2xs text-muted-foreground hover:text-foreground disabled:opacity-50" onClick={() => setObserving(criterion)}>Ajouter une observation</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Historique des critères ({quality.criteriaSnapshots.length} versions)</summary><div className="mt-2 space-y-3">{[...quality.criteriaSnapshots].reverse().map((version) => <div key={version.id}><p className="font-medium">Version {version.version} · {CREATOR_LABELS[version.createdBy]} · {qualityModeLabel(version.mode)}</p><ul className="mt-1 list-inside list-disc">{version.criteria.map((criterion) => <li key={criterion.id}>{formatQualityCriterionText(criterion, version.createdBy)}</li>)}</ul></div>)}</div></details>
        </>
      )}
      {editing && <CriteriaEditor snapshot={snapshot} busy={busy} onSave={onSave} onClose={() => setEditing(false)} />}
      {observing !== null && <HumanEvidenceEditor criterion={observing} onSave={onEvidence} onClose={() => setObserving(null)} />}
    </QualitySection>
  );
}
