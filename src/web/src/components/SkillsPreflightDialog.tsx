import { useState } from "react";

import type { SkillStatus } from "@shared/schemas";

import { SkillsStatusList } from "@/components/SkillsStatusList";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useCapabilities } from "@/hooks/useCapabilities";

const DISMISSED_STORAGE_KEY = "skills-preflight-dismissed";

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

/** Identifies the set of missing skills, so a newly missing skill shows the dialog again. */
function missingSignature(missing: SkillStatus[]): string {
  return missing
    .map((skill) => skill.name)
    .sort()
    .join(",");
}

function preflightCopy(missing: SkillStatus[]): PreflightCopy {
  const missingRequired = missing.filter((skill) => skill.tier === "required").length;
  if (missingRequired === 0) {
    return {
      title: "Skills recommandés absents",
      description:
        "Le pipeline fonctionne, mais ton CLAUDE.md global cite des skills introuvables : les agents les ignoreront. Ils sont disponibles sur skillzer.",
    };
  }
  const plural = missingRequired > 1 ? "s" : "";
  return {
    title: `${missingRequired} skill${plural} requis manquant${plural} sur ce Mac`,
    description:
      "Les agents ne pourront pas exécuter certaines étapes du pipeline (review, régression) : l'app fonctionnera moins bien. Installe-les depuis skillzer.",
  };
}

interface SkillsPreflightDialogProps {
  /** true while another blocking dialog (onboarding) owns the screen. */
  suppressed: boolean;
}

/** Warns once per session when host Claude Code skills the pipeline relies on are missing. */
export function SkillsPreflightDialog({ suppressed }: SkillsPreflightDialogProps) {
  const { skills } = useCapabilities();
  const [dismissedSignature] = useState(readDismissedSignature);
  const [closed, setClosed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const missing = skills.filter((skill) => !skill.installed);
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
      <SkillsStatusList skills={skills} />
    </Dialog>
  );
}
