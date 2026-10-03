import { QUALITY_DEFAULT_HEALTH_PATH, QUALITY_DEFAULT_TIMEOUT_MS, projectValidationSchema } from "@shared/quality";
import type { ProjectValidation } from "@shared/quality";

import { Field } from "@/components/projects-settings/ProjectPanelParts";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export interface ValidationDraft {
  enabled: boolean;
  isolated: boolean;
  requireBehavioral: boolean;
  setupCommand: string;
  startCommand: string;
  teardownCommand: string;
  healthPath: string;
  timeoutMs: string;
  environment: string;
}

export function validationDraft(value: ProjectValidation | undefined): ValidationDraft {
  return {
    enabled: value?.enabled ?? false,
    isolated: value?.isolated ?? true,
    requireBehavioral: value?.requireBehavioral ?? true,
    setupCommand: value?.setupCommand ?? "",
    startCommand: value?.startCommand ?? "",
    teardownCommand: value?.teardownCommand ?? "",
    healthPath: value?.healthPath ?? QUALITY_DEFAULT_HEALTH_PATH,
    timeoutMs: String(value?.timeoutMs ?? QUALITY_DEFAULT_TIMEOUT_MS),
    environment: JSON.stringify(value?.environment ?? {}, null, 2),
  };
}

export function validationDraftConfig(draft: ValidationDraft): ProjectValidation | null {
  if (!draft.enabled) return null;
  try {
    const environment: unknown = JSON.parse(draft.environment);
    const result = projectValidationSchema.safeParse({
      enabled: draft.enabled,
      requireBehavioral: draft.requireBehavioral,
      isolated: draft.isolated,
      setupCommand: draft.setupCommand.trim() || undefined,
      startCommand: draft.startCommand.trim() || undefined,
      teardownCommand: draft.teardownCommand.trim() || undefined,
      healthPath: draft.healthPath,
      timeoutMs: Number(draft.timeoutMs),
      environment,
    });
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

interface ValidationConfigFieldsProps {
  value: ValidationDraft;
  onChange: (value: ValidationDraft) => void;
}

export function ValidationConfigFields({ value, onChange }: ValidationConfigFieldsProps) {
  const invalid = value.enabled && validationDraftConfig(value) === null;
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Validation indépendante</h3>
          <p className="mt-1 text-xs text-muted-foreground">Un agent vérifie les parcours dans une copie séparée du projet.</p>
        </div>
        <Switch aria-label="Activer la validation indépendante" checked={value.enabled} onCheckedChange={(enabled) => onChange({ ...value, enabled })} />
      </div>
      {value.enabled && (
        <>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span>Environnement isolé (services et données de test séparés)</span>
            <Switch aria-label="Environnement de validation isolé" checked={value.isolated} onCheckedChange={(isolated) => onChange({ ...value, isolated })} />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <div><p>Exiger la validation des parcours</p><p className="mt-1 text-muted-foreground">Désactivé : les contrôles techniques et les critères d’acceptation requis restent nécessaires.</p></div>
            <Switch aria-label="Exiger la validation des parcours" checked={value.requireBehavioral} onCheckedChange={(requireBehavioral) => onChange({ ...value, requireBehavioral })} />
          </div>
          <p className="text-xs text-muted-foreground">Les commandes doivent utiliser le port et les données de test fournis par Atelier. Configurez la préparation et le nettoyage nécessaires au projet.</p>
          <Field label="Préparer l’environnement">
            <Input aria-label="Commande de préparation de validation" value={value.setupCommand} onChange={(event) => onChange({ ...value, setupCommand: event.target.value })} />
          </Field>
          <Field label="Démarrer l’application de test">
            <Input aria-label="Commande de démarrage de validation" value={value.startCommand} onChange={(event) => onChange({ ...value, startCommand: event.target.value })} />
          </Field>
          <Field label="Nettoyer après la validation">
            <Input aria-label="Commande de nettoyage de validation" value={value.teardownCommand} onChange={(event) => onChange({ ...value, teardownCommand: event.target.value })} />
          </Field>
          <Field label="Adresse de disponibilité" hint="Chemin HTTP, par exemple /health">
            <Input aria-label="Chemin de disponibilité de validation" value={value.healthPath} onChange={(event) => onChange({ ...value, healthPath: event.target.value })} />
          </Field>
          <Field label="Délai maximal en millisecondes">
            <Input aria-label="Délai maximal de validation" type="number" min={1} step={1} value={value.timeoutMs} onChange={(event) => onChange({ ...value, timeoutMs: event.target.value })} />
          </Field>
          <Field label="Variables d’environnement" hint="Objet JSON, valeurs textuelles uniquement">
            <Textarea aria-label="Variables d’environnement de validation" className="font-mono text-xs" value={value.environment} onChange={(event) => onChange({ ...value, environment: event.target.value })} />
          </Field>
          {invalid && <p role="alert" className="text-xs text-danger">Vérifiez le chemin, le délai positif et l’objet JSON des variables.</p>}
        </>
      )}
    </section>
  );
}
