import { useState } from "react";

import { ORCHESTRATOR_LABELS } from "@shared/constants";
import type { Orchestrator } from "@shared/constants";
import type { SkillStatus } from "@shared/schemas";
import { availableSkillProviders, missingSkillProviders } from "@shared/skills";

import { SkillsStatusList } from "@/components/SkillsStatusList";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useCapabilities } from "@/hooks/useCapabilities";

const DISMISSED_STORAGE_KEY = "skills-preflight-dismissed";
const SIGNATURE_PAIR_SEPARATOR = ":";
const PROVIDER_LIST_SEPARATOR = " et ";

interface MissingSkill {
  skill: SkillStatus;
  providers: Orchestrator[];
}

interface PreflightCopy {
  title: string;
  description: string;
}

function readDismissedSignature(): string | null {
  try {
    return window.localStorage.getItem(DISMISSED_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeDismissedSignature(signature: string): void {
  try {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, signature);
  } catch {
    return;
  }
}

/** Identifies the missing name+provider pairs, so a skill newly missing on any provider shows the dialog again. */
function missingSignature(missing: MissingSkill[]): string {
  return missing
    .flatMap(({ skill, providers }) => providers.map((provider) => `${skill.name}${SIGNATURE_PAIR_SEPARATOR}${provider}`))
    .sort()
    .join(",");
}

function providerList(missing: MissingSkill[]): string {
  const providers = new Set(missing.flatMap((entry) => entry.providers));
  return [...providers].map((provider) => ORCHESTRATOR_LABELS[provider]).join(PROVIDER_LIST_SEPARATOR);
}

function preflightCopy(missing: MissingSkill[]): PreflightCopy {
  const missingRequired = missing.filter((entry) => entry.skill.tier === "required");
  if (missingRequired.length === 0) {
    return {
      title: "Skills recommandés absents",
      description: `Le pipeline fonctionne, mais tes instructions globales citent des skills introuvables pour ${providerList(missing)} : les agents les ignoreront. Ils sont disponibles sur skillzer.`,
    };
  }
  const plural = missingRequired.length > 1 ? "s" : "";
  return {
    title: `${missingRequired.length} skill${plural} requis manquant${plural} pour ${providerList(missingRequired)}`,
    description:
      "Les agents ne pourront pas exécuter certaines étapes du pipeline (review, régression) : l'app fonctionnera moins bien. Installe-les depuis skillzer.",
  };
}

interface SkillsPreflightDialogProps {
  /** true while another blocking dialog (onboarding) owns the screen. */
  suppressed: boolean;
}

/** Warns once per session when host skills the pipeline relies on are missing for a provider detected on this Mac. */
export function SkillsPreflightDialog({ suppressed }: SkillsPreflightDialogProps) {
  const capabilities = useCapabilities();
  const { skills } = capabilities;
  const availableProviders = availableSkillProviders(capabilities);
  const [dismissedSignature] = useState(readDismissedSignature);
  const [closed, setClosed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const missing = skills
    .map((skill) => ({ skill, providers: missingSkillProviders(skill.installed, availableProviders) }))
    .filter((entry) => entry.providers.length > 0);
  const signature = missingSignature(missing);
  const open = !suppressed && !closed && missing.length > 0 && signature !== dismissedSignature;

  const close = (): void => {
    if (dontShowAgain) writeDismissedSignature(signature);
    setClosed(true);
  };

  const { title, description } = preflightCopy(missing);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      size="md"
      title={title}
      description={description}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={dontShowAgain} onCheckedChange={setDontShowAgain} />
            Ne plus afficher
          </label>
          <Button type="button" size="sm" onClick={close}>
            Continuer quand même
          </Button>
        </div>
      }
    >
      <SkillsStatusList skills={skills} availableProviders={availableProviders} />
    </Dialog>
  );
}
