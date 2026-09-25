import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";

import { SKILL_TIERS, SKILLZER_REPO_URL, skillzerInstallCommand } from "@shared/skills";
import type { SkillTier } from "@shared/skills";
import type { SkillStatus } from "@shared/schemas";

import { Button, buttonVariants } from "@/components/ui/button";
import { refreshCapabilities } from "@/hooks/useCapabilities";
import { useSavedFlash } from "@/hooks/useSavedFlash";
import { cn } from "@/lib/utils";

const TIER_LABELS: Record<SkillTier, string> = {
  required: "Requis par le pipeline",
  recommended: "Recommandés (CLAUDE.md global)",
};

const MISSING_DOT_CLASSES: Record<SkillTier, string> = {
  required: "bg-danger",
  recommended: "bg-warning",
};

const INSTALLED_DOT_CLASS = "bg-success";
const INSTALLED_LABEL = "installé";
const MISSING_LABEL = "manquant";
const COMMENT_PREFIX = "#";

type CopyOutcome = "copied" | "selected";

const COPY_LABELS: Record<CopyOutcome, string> = {
  copied: "Copié",
  selected: "Sélectionné",
};

const COPY_IDLE_LABEL = "Copier";

function expectedSkillPath(name: string): string {
  return `~/.claude/skills/${name}/SKILL.md`;
}

function installLine(skill: SkillStatus): string {
  if (skill.installHint === null) return skillzerInstallCommand(skill.name);
  return `${COMMENT_PREFIX} ${skill.name} : ${skill.installHint}`;
}

function selectContents(node: HTMLElement | null): void {
  const selection = window.getSelection();
  if (node === null || selection === null) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

interface SkillsStatusListProps {
  skills: SkillStatus[];
}

/** Host skills grouped by tier with their detection state, plus install commands for the missing ones. */
export function SkillsStatusList({ skills }: SkillsStatusListProps) {
  const missing = skills.filter((skill) => !skill.installed);

  return (
    <div className="space-y-4">
      {SKILL_TIERS.map((tier) => (
        <SkillTierGroup key={tier} tier={tier} skills={skills.filter((skill) => skill.tier === tier)} />
      ))}
      {missing.length > 0 && <InstallBlock missing={missing} />}
      <SkillsActions />
    </div>
  );
}

function SkillTierGroup({ tier, skills }: { tier: SkillTier; skills: SkillStatus[] }) {
  if (skills.length === 0) return null;
  const installedCount = skills.filter((skill) => skill.installed).length;

  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{TIER_LABELS[tier]}</span>
        <span className="font-mono">
          {installedCount}/{skills.length}
        </span>
      </div>
      <ul className="divide-y rounded-md border">
        {skills.map((skill) => (
          <SkillRow key={skill.name} skill={skill} />
        ))}
      </ul>
    </section>
  );
}

function SkillRow({ skill }: { skill: SkillStatus }) {
  const dotClass = skill.installed ? INSTALLED_DOT_CLASS : MISSING_DOT_CLASSES[skill.tier];

  return (
    <li className="flex items-start gap-3 px-3 py-2">
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm">{skill.name}</p>
        <p className="text-xs text-muted-foreground">{skill.purpose}</p>
        {!skill.installed && (
          <p className="font-mono text-2xs text-muted-foreground">
            attendu : {expectedSkillPath(skill.name)}
          </p>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {skill.installed ? INSTALLED_LABEL : MISSING_LABEL}
      </span>
    </li>
  );
}

function InstallBlock({ missing }: { missing: SkillStatus[] }) {
  const commandsRef = useRef<HTMLPreElement>(null);
  const { savedValue: copyOutcome, flashSaved: flashCopyOutcome } = useSavedFlash<CopyOutcome>();
  const lines = missing.map(installLine);

  const copy = async (): Promise<void> => {
    const commands = lines.filter((line) => !line.startsWith(COMMENT_PREFIX)).join("\n");
    try {
      await navigator.clipboard.writeText(commands);
      flashCopyOutcome("copied");
    } catch {
      selectContents(commandsRef.current);
      flashCopyOutcome("selected");
    }
  };

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
        <span>Installation, à coller dans un terminal</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
          {copyOutcome === null ? COPY_IDLE_LABEL : COPY_LABELS[copyOutcome]}
        </Button>
      </div>
      <pre ref={commandsRef} className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
        {lines.map((line) => (
          <span
            key={line}
            className={cn("block", line.startsWith(COMMENT_PREFIX) && "text-muted-foreground")}
          >
            {line}
          </span>
        ))}
      </pre>
    </div>
  );
}

function SkillsActions() {
  const [checking, setChecking] = useState(false);

  const recheck = async (): Promise<void> => {
    setChecking(true);
    try {
      await refreshCapabilities();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={SKILLZER_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Ouvrir skillzer
        <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
      <Button type="button" variant="outline" size="sm" disabled={checking} onClick={() => void recheck()}>
        <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />
        {checking ? "Vérification…" : "Revérifier"}
      </Button>
    </div>
  );
}
