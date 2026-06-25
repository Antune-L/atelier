import type { z } from "zod";

import {
  AGENT_EFFORT_LABELS,
  AGENT_MODEL_LABELS,
  IMPLEMENTER_LABELS,
  REVIEW_DEPTH_LABELS,
} from "@shared/constants";
import type { Ticket } from "@shared/schemas";
import { agentEffortSchema, agentModelSchema } from "@shared/schemas";

import { useCapabilities } from "@/hooks/useCapabilities";

const YES = "Oui";
const NO = "Non";

/** Resolves an enum knob to its label, falling back to the orchestrator default when unset. */
function labelWithDefault<T extends string>(
  value: T | null,
  rawDefault: string,
  schema: z.ZodType<T>,
  labels: Record<T, string>,
): string {
  if (value) return labels[value];
  const parsed = schema.safeParse(rawDefault);
  return parsed.success ? `Défaut (${labels[parsed.data]})` : "Défaut";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/**
 * Read-only recap of the creation-time options of a ticket (orchestrator model/effort,
 * implementer, PR knobs). Editing lives in the TODO column; this is just for reference
 * once the ticket has left it.
 */
export function TicketConfigSummary({ ticket }: { ticket: Ticket }) {
  const {
    defaultModel,
    defaultEffort,
    defaultImplementerModel,
    defaultImplementerEffort,
  } = useCapabilities();

  // A null per-ticket knob falls back to the configured default: show it explicitly.
  const modelValue = labelWithDefault(
    ticket.model,
    defaultModel,
    agentModelSchema,
    AGENT_MODEL_LABELS,
  );
  const effortValue = labelWithDefault(
    ticket.effort,
    defaultEffort,
    agentEffortSchema,
    AGENT_EFFORT_LABELS,
  );
  const implementerModelValue = labelWithDefault(
    ticket.implementerModel,
    defaultImplementerModel,
    agentModelSchema,
    AGENT_MODEL_LABELS,
  );
  const implementerEffortValue = labelWithDefault(
    ticket.implementerEffort,
    defaultImplementerEffort,
    agentEffortSchema,
    AGENT_EFFORT_LABELS,
  );

  return (
    <details className="rounded-md border bg-muted/30 p-3">
      <summary className="cursor-pointer text-sm font-semibold">
        Options de création
      </summary>
      <dl className="mt-3 space-y-2">
        <Row label="Modèle (orchestrateur)" value={modelValue} />
        <Row label="Effort (orchestrateur)" value={effortValue} />
        {ticket.kind === "review" && (
          <>
            {ticket.reviewDepth && (
              <Row
                label="Profondeur de revue"
                value={REVIEW_DEPTH_LABELS[ticket.reviewDepth]}
              />
            )}
            {ticket.prNumber !== null && (
              <Row label="PR analysée" value={`#${ticket.prNumber}`} />
            )}
            <Row
              label="Commentaires postés sur GitHub"
              value={ticket.postComments ? YES : NO}
            />
            <Row
              label="Correction des retours"
              value={ticket.fixComments ? YES : NO}
            />
          </>
        )}
        {/* A clean ticket carries only the target PR (no depth/post/fix knobs). */}
        {ticket.kind === "clean" && ticket.prNumber !== null && (
          <>
            <Row label="PR nettoyée" value={`#${ticket.prNumber}`} />
            {ticket.prHeadBranch !== null && (
              <Row label="Branche de la PR" value={ticket.prHeadBranch} />
            )}
          </>
        )}
        {/* An ask ticket is read-only: only the model/effort rows above apply (no implementer/PR knobs). */}
        {ticket.kind === "feature" && (
          <>
            <Row
              label="Implémenté par"
              value={IMPLEMENTER_LABELS[ticket.implementer]}
            />
            {ticket.implementer === "claude" && (
              <>
                <Row
                  label="Modèle (implémenteur)"
                  value={implementerModelValue}
                />
                <Row
                  label="Effort (implémenteur)"
                  value={implementerEffortValue}
                />
              </>
            )}
            <Row label="PRD" value={ticket.prdEnabled ? YES : NO} />
            <Row
              label="PR en draft"
              value={ticket.prDraft && !ticket.autoMerge ? YES : NO}
            />
            <Row
              label="Merge automatique"
              value={ticket.autoMerge ? YES : NO}
            />
            <Row label="À review (sans PR)" value={ticket.stealth ? YES : NO} />
            <Row label="Push direct (sans PR)" value={ticket.directPush ? YES : NO} />
            <Row
              label="Captures d'écran dans la PR"
              value={ticket.addScreenshots && !ticket.autoMerge ? YES : NO}
            />
            <Row
              label="Branche de base"
              value={ticket.baseBranch ?? "Défaut du projet"}
            />
          </>
        )}
      </dl>
    </details>
  );
}
