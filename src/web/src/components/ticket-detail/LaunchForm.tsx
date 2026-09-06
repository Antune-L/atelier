import { useRef, useState } from "react";

import type { Orchestrator } from "@shared/constants";
import type { ProjectInfo, Ticket, UpdateTicketInput } from "@shared/schemas";

import { AgentProfileConfig } from "@/components/AgentProfileConfig";
import { TicketOptionsToggleGroup } from "@/components/TicketOptionsToggleGroup";
import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { BranchCombobox, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useBoard } from "@/hooks/useBoard";
import { pairedImplementer } from "@/lib/agentPairing";
import { api } from "@/lib/api";
import { dependencyCandidates } from "@/lib/display";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";

interface LaunchFormProps {
  ticket: Ticket;
  projects: ProjectInfo[];
  /** Project / base branch / dependency are only editable before launch and while unlocked. */
  canEditTarget: boolean;
}

const PROJECT_ID = "ticket-project";
const BASE_BRANCH_ID = "ticket-base-branch";
const DEPENDS_ON_ID = "ticket-depends-on";
const OPTIONS_HEADING_ID = "ticket-detail-options-heading";

/** Pre-launch configuration of a TODO ticket: target, dependency and agent knobs. */
export function LaunchForm({ ticket, projects, canEditTarget }: LaunchFormProps) {
  const { tickets: boardTickets } = useBoard();
  // Base-branch picker state. null = remote list not loaded yet.
  const [branches, setBranches] = useState<string[] | null>(null);
  const [branchesKey, setBranchesKey] = useState<string | null>(null);
  // Tracks the latest requested project so an out-of-order branch fetch is dropped.
  const latestBranchKey = useRef<string | null>(null);

  // Load the project's branches once per project, mirroring the load-on-render pattern.
  if (canEditTarget && ticket.project !== branchesKey) {
    const key = ticket.project;
    latestBranchKey.current = key;
    setBranchesKey(key);
    setBranches(null);
    void api
      .projectBranches(key)
      .then((list) => latestBranchKey.current === key && setBranches(list))
      .catch(() => latestBranchKey.current === key && setBranches([]));
  }

  const patch = (fields: UpdateTicketInput): void => {
    void api.updateTicket(ticket.id, fields).catch(() => undefined);
  };

  const projectDefaultBranch = projects.find((p) => p.key === ticket.project)?.baseBranch ?? "";
  // Current selection resolves null (no override) to the project default for display.
  const selectedBaseBranch = ticket.baseBranch ?? projectDefaultBranch;
  // The project default and the saved selection stay selectable while the remote list loads/fails.
  const baseBranchOptions = (() => {
    const list = branches ?? [];
    const pinned = [projectDefaultBranch, selectedBaseBranch].filter((b) => b && !list.includes(b));
    return [...new Set([...pinned, ...list])];
  })();

  // Send null when the choice matches the project default → keep "no override" semantics.
  const changeBaseBranch = (value: string): void => {
    patch({ baseBranch: value && value !== projectDefaultBranch ? value : null });
  };

  // Changing the orchestrator re-pairs the implementer in a single PATCH so the ticket never lands
  // on a forbidden orchestrator/implementer pair between two requests.
  const setOrchestrator = (orchestrator: Orchestrator): void => {
    patch({ orchestrator, implementer: pairedImplementer(orchestrator, ticket.implementer) });
  };

  const dependsCandidates = dependencyCandidates(
    boardTickets,
    ticket.project,
    ticket.id,
    ticket.dependsOn,
  );

  return (
    <div className="grid grid-cols-1 items-start gap-x-4 gap-y-4 lg:grid-cols-2">
      {canEditTarget && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={PROJECT_ID} className={FIELD_LABEL_CLASSES}>Projet</Label>
            <Select
              id={PROJECT_ID}
              value={ticket.project}
              onChange={(e) => e.target.value !== ticket.project && patch({ project: e.target.value })}
              className="w-full"
            >
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={BASE_BRANCH_ID} className={FIELD_LABEL_CLASSES}>Branche de base du worktree</Label>
            <BranchCombobox
              id={BASE_BRANCH_ID}
              value={selectedBaseBranch}
              onChange={changeBaseBranch}
              options={baseBranchOptions}
              disabled={branches === null}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={DEPENDS_ON_ID} className={FIELD_LABEL_CLASSES}>Dépend du ticket (stack PR)</Label>
            <Select
              id={DEPENDS_ON_ID}
              value={ticket.dependsOn ?? ""}
              onChange={(e) => patch({ dependsOn: e.target.value || null })}
              className="w-full"
            >
              <option value="">Aucune</option>
              {dependsCandidates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </div>
        </>
      )}

      <div className="space-y-2 lg:col-span-2">
        <SectionHeader>Agent d'implémentation</SectionHeader>
        <AgentProfileConfig
          orchestrator={ticket.orchestrator}
          model={ticket.model}
          effort={ticket.effort}
          implementerModel={ticket.implementerModel}
          implementerEffort={ticket.implementerEffort}
          implementer={ticket.implementer}
          codexModel={ticket.codexModel}
          codexEffort={ticket.codexEffort}
          codexFast={ticket.codexFast}
          codexImplementerModel={ticket.codexImplementerModel}
          codexImplementerEffort={ticket.codexImplementerEffort}
          codexImplementerFast={ticket.codexImplementerFast}
          onOrchestratorChange={setOrchestrator}
          onModelChange={(model) => patch({ model })}
          onEffortChange={(effort) => patch({ effort })}
          onImplementerModelChange={(implementerModel) => patch({ implementerModel })}
          onImplementerEffortChange={(implementerEffort) => patch({ implementerEffort })}
          onImplementerChange={(implementer) => patch({ implementer })}
          onCodexModelChange={(codexModel) => patch({ codexModel })}
          onCodexEffortChange={(codexEffort) => patch({ codexEffort })}
          onCodexFastChange={(codexFast) => patch({ codexFast })}
          onCodexImplementerModelChange={(codexImplementerModel) => patch({ codexImplementerModel })}
          onCodexImplementerEffortChange={(codexImplementerEffort) => patch({ codexImplementerEffort })}
          onCodexImplementerFastChange={(codexImplementerFast) => patch({ codexImplementerFast })}
          onApplyProfile={patch}
        />
      </div>

      <div className="lg:col-span-2">
        <TicketOptionsToggleGroup
          key={ticket.id}
          title="Options de PR"
          headingId={OPTIONS_HEADING_ID}
          values={{
            prdEnabled: ticket.prdEnabled,
            prDraft: ticket.prDraft,
            autoMerge: ticket.autoMerge,
            stealth: ticket.stealth,
            directPush: ticket.directPush,
            verifyFeature: ticket.verifyFeature,
            argusMultiLoop: ticket.argusMultiLoop,
          }}
          onChange={(next) => patch(next)}
        />
      </div>
    </div>
  );
}
