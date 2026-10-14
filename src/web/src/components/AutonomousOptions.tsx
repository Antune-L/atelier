import { autonomousDeliverySchema, autonomousMaxStartsSchema, autonomousFinalizationMinutesSchema, autonomousMaxPublicationAttemptsSchema, AUTONOMOUS_MAX_CORRECTIONS, AUTONOMOUS_MAX_TIMEOUT_MINUTES } from "@shared/autonomous";
import type { AutonomousDelivery } from "@shared/autonomous";
import type { ProjectInfo } from "@shared/schemas";

import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface AutonomousOptionValues {
  autonomous: boolean;
  autonomousDelivery: AutonomousDelivery | null;
  autonomousMaxCorrections: number;
  autonomousTimeoutMinutes: number;
  autonomousMaxStarts: number;
  autonomousFinalizationMinutes: number;
  autonomousMaxPublicationAttempts: number;
}

export function autonomousEligibility(project: ProjectInfo | undefined, implementer: string, independent: boolean): { eligible: boolean; reason: string | null } {
  if (project?.vcsProvider !== "github") return { eligible: false, reason: "Le pilote local nécessite un projet GitHub." };
  if (project.autonomousPilot !== true) return { eligible: false, reason: "Pilote indisponible sur ce poste : désactivé, ou validation qualité confiée à l'autre poste." };
  if (implementer === "composer" || !independent) return { eligible: false, reason: "Le pilote nécessite Claude ou Codex et une carte indépendante." };
  return { eligible: true, reason: null };
}

/** A cloud host refuses the "merge" delivery: callers normalise it away before display and submit. */
export function prOnlyAutonomousOptions(values: AutonomousOptionValues, prOnly: boolean): AutonomousOptionValues {
  return prOnly && values.autonomousDelivery === "merge" ? { ...values, autonomousDelivery: null } : values;
}

export function AutonomousOptions({ values, onChange, disabled = false, prOnly = false, id }: {
  values: AutonomousOptionValues;
  onChange: (values: AutonomousOptionValues) => void;
  disabled?: boolean;
  /** Cloud host: only "PR seulement" delivery is offered. */
  prOnly?: boolean;
  id: string;
}) {
  if (!values.autonomous) return null;

  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-xs text-muted-foreground">Claude ou Codex réalise la carte sur ce Mac, vérifie la preview Coolify, puis livre selon votre choix.</p>
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${id}-delivery`}>Livraison</Label>
          <Select id={`${id}-delivery`} value={values.autonomousDelivery ?? ""} disabled={disabled} onChange={(event) => {
            const parsed = autonomousDeliverySchema.safeParse(event.target.value);
            onChange({ ...values, autonomousDelivery: parsed.success ? parsed.data : null });
          }}>
            <option value="">Choisir la livraison</option>
            <option value="pr_only">Créer la PR sans fusionner</option>
            {!prOnly && <option value="merge">Fusionner après contrôles satisfaisants</option>}
          </Select>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor={`${id}-corrections`}>Corrections maximum</Label>
            <Input id={`${id}-corrections`} type="number" min={0} max={AUTONOMOUS_MAX_CORRECTIONS} value={values.autonomousMaxCorrections} disabled={disabled} onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (Number.isInteger(value) && value >= 0 && value <= AUTONOMOUS_MAX_CORRECTIONS) onChange({ ...values, autonomousMaxCorrections: value });
            }} />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor={`${id}-timeout`}>Durée totale (minutes)</Label>
            <Input id={`${id}-timeout`} type="number" min={1} max={AUTONOMOUS_MAX_TIMEOUT_MINUTES} value={values.autonomousTimeoutMinutes} disabled={disabled} onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (Number.isInteger(value) && value > 0 && value <= AUTONOMOUS_MAX_TIMEOUT_MINUTES) onChange({ ...values, autonomousTimeoutMinutes: value });
            }} />
          </div>
        </div>
        {([
          { field: "autonomousMaxStarts", label: "Garde-fou des démarrages (expérimental, à calibrer)", schema: autonomousMaxStartsSchema },
          { field: "autonomousFinalizationMinutes", label: "Réserve de finalisation (minutes)", schema: autonomousFinalizationMinutesSchema },
          { field: "autonomousMaxPublicationAttempts", label: "Tentatives de publication maximum", schema: autonomousMaxPublicationAttemptsSchema },
        ] satisfies { field: keyof Pick<AutonomousOptionValues, "autonomousMaxStarts" | "autonomousFinalizationMinutes" | "autonomousMaxPublicationAttempts">; label: string; schema: typeof autonomousMaxStartsSchema }[]).map(({ field, label, schema }) => <div key={field} className="space-y-1">
          <Label htmlFor={`${id}-${field}`}>{label}</Label>
          <Input id={`${id}-${field}`} type="number" min={1} value={values[field]} disabled={disabled} onChange={(event) => {
            const parsed = schema.safeParse(event.target.valueAsNumber);
            if (parsed.success) onChange({ ...values, [field]: parsed.data });
          }} />
        </div>)}
        <p className="text-xs text-muted-foreground">Le nombre de démarrages est une limite de sécurité, pas une mesure d’avancement. Une limite atteinte déclenche une publication partielle avec réserves.</p>
      </div>
    </div>
  );
}
