import { autonomousDeliverySchema, AUTONOMOUS_MAX_CORRECTIONS, AUTONOMOUS_MAX_TIMEOUT_MINUTES } from "@shared/autonomous";
import type { AutonomousDelivery } from "@shared/autonomous";
import type { ProjectInfo } from "@shared/schemas";

import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface AutonomousOptionValues {
  autonomous: boolean;
  autonomousDelivery: AutonomousDelivery | null;
  autonomousMaxCorrections: number;
  autonomousTimeoutMinutes: number;
}

export function autonomousEligibility(project: ProjectInfo | undefined, implementer: string, independent: boolean): { eligible: boolean; reason: string | null } {
  if (project?.vcsProvider !== "github") return { eligible: false, reason: "Le pilote local nécessite un projet GitHub." };
  if (project.autonomousPilot !== true) return { eligible: false, reason: "Pilote local non activé sur ce Mac." };
  if (implementer === "composer" || !independent) return { eligible: false, reason: "Le pilote nécessite Claude ou Codex et une carte indépendante." };
  return { eligible: true, reason: null };
}

export function AutonomousOptions({ values, onChange, eligible, unavailableReason, disabled = false, id }: {
  values: AutonomousOptionValues;
  onChange: (values: AutonomousOptionValues) => void;
  eligible: boolean;
  unavailableReason?: string | null;
  disabled?: boolean;
  id: string;
}) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.autonomous} disabled={disabled || (!eligible && !values.autonomous)} onChange={(event) => onChange({ ...values, autonomous: event.target.checked })} />
        Devin (mode autonome interne)
      </label>
      <p className="text-xs text-muted-foreground">Claude ou Codex réalise la carte sur ce Mac, vérifie la preview Coolify, puis livre selon votre choix.</p>
      {!eligible && <p className="text-xs text-muted-foreground">{unavailableReason ?? "Le pilote nécessite GitHub, Claude ou Codex et une carte indépendante."}</p>}
      {values.autonomous && (
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label htmlFor={`${id}-delivery`}>Livraison</Label>
            <Select id={`${id}-delivery`} value={values.autonomousDelivery ?? ""} disabled={disabled} onChange={(event) => {
              const parsed = autonomousDeliverySchema.safeParse(event.target.value);
              onChange({ ...values, autonomousDelivery: parsed.success ? parsed.data : null });
            }}>
              <option value="">Choisir la livraison</option>
              <option value="pr_only">Créer la PR sans fusionner</option>
              <option value="merge">Fusionner après contrôles satisfaisants</option>
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
        </div>
      )}
    </div>
  );
}
