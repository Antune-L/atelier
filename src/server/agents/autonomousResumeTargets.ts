import type { AutonomousResumeTarget } from "../../shared/autonomous.ts";
import type { QualityCriterion, QualityEvidence, QualityGate } from "../../shared/quality.ts";

const RESUME_REQUESTED = "Reprise demandée par l’utilisateur.";
const NO_PR_MUTATION = "N’ouvre ni ne fusionne de PR.";
const WITHOUT_REVIEW_GUIDANCE = "Ce ticket n’a pas de plan d’implémentation persistant (submit_implementation_plan n’a jamais été appelé ; le plan autonome figé ne compte pas) et sa livraison reste une PR relue par un humain. Si le budget de review est épuisé, ne relance pas les reviewers et n’appelle pas fail pour ce motif : le backend accepte le code modifié après la dernière passe et le signale dans la PR.";
export const AUTONOMOUS_RESUME_PROMPT = `${RESUME_REQUESTED} Si le worktree est propre et poussé et que la dernière review indépendante couvre le code courant, appelle validate_autonomous puis termine ton tour. Sinon, termine d’abord la correction, la review, le commit et le push. ${NO_PR_MUTATION}`;
export const AUTONOMOUS_RESUME_WITHOUT_REVIEW_PROMPT = `${RESUME_REQUESTED} ${WITHOUT_REVIEW_GUIDANCE} Commit et pousse si nécessaire, puis appelle validate_autonomous et termine ton tour. ${NO_PR_MUTATION}`;
export const AUTONOMOUS_RESUME_PLANNING_PROMPT = "Reprise explicite avec l’enveloppe restante. Termine le plan autonome initial avant toute modification et conserve tous les travaux précédents.";

const TARGETED_RESUME_HEADER = `Reprise ciblée demandée par l’utilisateur. Travaille dans le même worktree et sur la même PR. ${NO_PR_MUTATION} Termine par validate_autonomous puis termine ton tour.`;
const TARGET_INSTRUCTIONS: Record<AutonomousResumeTarget["action"], string> = {
  verify: "revérifier seulement. Ne modifie pas le code pour ce critère ; assure-toi seulement que le worktree est propre et poussé, puis appelle validate_autonomous.",
  fix: "corriger le code. Diagnostique la cause, corrige dans le même worktree, relance la review indépendante, commit et push, puis appelle validate_autonomous.",
};
export const AUTONOMOUS_TARGET_EVIDENCE_STATUS: Record<AutonomousResumeTarget["action"], QualityEvidence["status"]> = { verify: "inconclusive", fix: "failed" };

export const AUTONOMOUS_TARGETS_UNAVAILABLE = "La validation est indisponible : la reprise ciblée par critère ne peut pas être préparée.";
export const AUTONOMOUS_TARGET_NO_CORRECTION = "Aucune correction ne reste disponible pour corriger le code. Accordez au moins une correction supplémentaire ou choisissez de revérifier seulement.";

export interface AutonomousResumePlan {
  targeted: Array<{ target: AutonomousResumeTarget; criterion: QualityCriterion }>;
  reserves: QualityCriterion[];
}

function criterionLabel(criterion: QualityCriterion): string {
  return `${criterion.id} « ${criterion.text} »`;
}

export function resolveAutonomousResumeTargets(targets: AutonomousResumeTarget[], criteria: QualityCriterion[], gate: Pick<QualityGate, "requiredCriteria" | "verifiedCriteria">): { ok: true; plan: AutonomousResumePlan } | { ok: false; result: string } {
  const unverified = criteria.filter((criterion) => gate.requiredCriteria.includes(criterion.id) && !gate.verifiedCriteria.includes(criterion.id));
  const targeted: AutonomousResumePlan["targeted"] = [];
  for (const target of targets) {
    const criterion = unverified.find((candidate) => candidate.id === target.criterionId);
    if (!criterion) return { ok: false, result: `Le critère ${target.criterionId} n’est pas un critère requis non vérifié de cette carte. Actualisez la validation avant de reprendre.` };
    targeted.push({ target, criterion });
  }
  const reserves = unverified.filter((criterion) => !targets.some((target) => target.criterionId === criterion.id));
  return { ok: true, plan: { targeted, reserves } };
}

export function autonomousTargetedResumePrompt(plan: AutonomousResumePlan, options: { withoutReview: boolean; correction: { used: number; max: number } | null }): string {
  const lines = [TARGETED_RESUME_HEADER, "Critères ciblés :"];
  for (const { target, criterion } of plan.targeted) {
    lines.push(`- Critère ${criterionLabel(criterion)} : ${TARGET_INSTRUCTIONS[target.action]}`);
    if (target.observation !== undefined) lines.push(`  Observation de l’utilisateur : ${target.observation}`);
  }
  if (plan.reserves.length > 0) lines.push(`Critères laissés en réserve, ne travaille pas dessus : ${plan.reserves.map(criterionLabel).join("; ")}.`);
  if (options.withoutReview) lines.push(WITHOUT_REVIEW_GUIDANCE);
  if (options.correction !== null) lines.push(`Correction ${options.correction.used}/${options.correction.max}.`);
  return lines.join("\n");
}
