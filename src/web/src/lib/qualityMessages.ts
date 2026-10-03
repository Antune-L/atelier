import type { QualityCriteriaSnapshot, QualityCriterion, QualityEvidence, QualityRunPhase, QualityValidationMode, QualityValidationRun, TicketQuality } from "@shared/quality";

import { errorMessage } from "@/lib/errors";

const QUALITY_MESSAGES: Readonly<Record<string, string>> = {
  "Validation DATABASE_URL must contain a run-specific database namespace, path, directory, or port placeholder.": "La variable DATABASE_URL de validation doit contenir un marqueur propre à l’exécution pour la base de données, le chemin, le dossier ou le port.",
  "No versioned acceptance criteria are defined.": "Aucune version des critères d’acceptation n’est définie.",
  "Acceptance criteria will be prepared automatically during verification.": "Les critères d’acceptation seront préparés automatiquement pendant la vérification.",
  "Dependency installation failed.": "L’installation des dépendances du projet a échoué.",
  "Validation setup requires an isolated environment.": "La préparation de la validation nécessite un environnement isolé.",
  "Ticket changed while acceptance criteria were being prepared.": "Le ticket a changé pendant la préparation des critères d’acceptation.",
  "Criteria preparation modified the committed validation source.": "La préparation des critères a modifié la version du code à valider.",
  "Configure isolated services and an application start command before browser validation.": "Configurez les services isolés et une commande de démarrage de l’application avant la validation dans le navigateur.",
  "An isolated browser validation environment is not configured.": "Aucun environnement isolé n’est configuré pour la validation dans le navigateur.",
  "Environment preparation modified the committed validation source.": "La préparation de l’environnement a modifié la version du code à valider.",
  "Independent validation has no criteria or provider.": "La validation indépendante ne dispose pas de critères ou d’agent.",
  "Simulation does not produce independent validation evidence.": "Une simulation ne produit pas de preuve indépendante de validation.",
  "The ticket or PRD changed after the acceptance criteria were recorded.": "Le ticket ou le PRD a changé depuis l’enregistrement des critères d’acceptation.",
  "An isolated behavioral validation environment is not configured.": "Aucun environnement isolé n’est configuré pour la validation des parcours.",
  "No isolated application start command is configured.": "Aucune commande de démarrage de l’application isolée n’est configurée.",
  "A quality run is already active for this ticket.": "Une validation est déjà en cours pour ce ticket.",
  "Quality validation is shutting down.": "Le service de validation est en cours d’arrêt.",
  "Define acceptance criteria before starting behavioral validation.": "Définissez les critères d’acceptation avant de lancer la validation des parcours.",
  "Quality run cancelled.": "La validation a été annulée.",
  "Configure isolated services and an application start command before behavioral validation.": "Configurez les services isolés et une commande de démarrage de l’application avant de valider les parcours.",
  "Validation environment setup failed.": "La préparation de l’environnement de validation a échoué.",
  "Environment setup modified the committed validation source.": "La préparation de l’environnement a modifié la version du code à valider.",
  "No existing typecheck, lint, or test commands are configured.": "Aucune commande existante de vérification des types, de qualité du code ou de tests n’est configurée.",
  "Checks modified the validated source; their evidence cannot be accepted.": "Les contrôles ont modifié le code à valider ; leurs preuves ne peuvent pas être acceptées.",
  "Behavioral validation has no criteria or provider.": "La validation des parcours ne dispose pas de critères ou d’agent.",
  "Simulation does not produce independent behavioral evidence.": "Une simulation ne produit pas de preuve indépendante du comportement.",
  "Validator returned no independently attributable session identity.": "Le validateur n’a pas fourni d’identité de session indépendante vérifiable.",
  "Validator returned duplicate acceptance criteria.": "Le validateur a renvoyé des critères d’acceptation en double.",
  "Validator returned an unknown acceptance criterion.": "Le validateur a renvoyé un critère d’acceptation inconnu.",
  "Validator evidence has inconsistent session provenance.": "La provenance de session des preuves du validateur est incohérente.",
  "Validator modified the validated source; its evidence cannot be accepted.": "Le validateur a modifié le code à valider ; ses preuves ne peuvent pas être acceptées.",
  "One or more technical checks failed.": "Un ou plusieurs contrôles techniques ont échoué.",
  "Some required acceptance criteria were not independently verified.": "Certains critères d’acceptation requis n’ont pas été vérifiés indépendamment.",
  "Validation service teardown failed.": "Le nettoyage du service de validation a échoué.",
  "Current server-run technical checks are missing or unsuccessful.": "Les contrôles techniques exécutés par le serveur pour la version actuelle sont manquants ou en échec.",
  "Versioned acceptance criteria are required.": "Une version des critères d’acceptation est requise.",
  "Acceptance criteria must be reconfirmed after ticket or PRD changes.": "Les critères d’acceptation doivent être confirmés à nouveau après une modification du ticket ou du PRD.",
  "Current independent behavioral validation is missing or unsuccessful.": "La validation indépendante du ticket pour la version actuelle est manquante ou en échec.",
  "Quality validation is still running.": "La validation est toujours en cours.",
  "A validation environment still requires cleanup.": "Un environnement de validation doit encore être nettoyé.",
  "Acceptance criterion does not exist in the current version.": "Ce critère d’acceptation n’existe pas dans la version actuelle.",
  "Backend restarted before quality validation completed.": "Le serveur a redémarré avant la fin de la validation.",
  "Validation configuration changed; restore it before retrying environment cleanup.": "La configuration de validation a changé ; restaurez-la avant de réessayer le nettoyage de l’environnement.",
  "Recovered validation service teardown failed.": "Le nettoyage du service de validation repris a échoué.",
  "Browser MCP preflight timed out": "Le délai de préparation des outils de navigateur MCP est dépassé.",
  "Unknown browser startup failure": "Le démarrage du navigateur a échoué pour une raison inconnue.",
  "Validation cancelled during browser preflight": "La validation a été annulée pendant la préparation du navigateur.",
  "Validation cancelled before session startup": "La validation a été annulée avant le démarrage de la session.",
  "Validation cancelled": "La validation a été annulée.",
  "Behavioral validation timed out": "Le délai de validation des parcours est dépassé.",
  "Pipeline tools are unavailable during behavioral validation": "Les outils du processus de développement sont indisponibles pendant la validation des parcours.",
  "Validator session cleanup timed out": "Le délai de nettoyage de la session du validateur est dépassé.",
  "Validator session did not initialize": "La session du validateur n’a pas démarré.",
  "Invalid validation identity.": "L’identité de validation est invalide.",
  "Validation Git command failed.": "La commande Git de validation a échoué.",
  "Validation source does not belong to the project repository.": "Le code à valider n’appartient pas au dépôt du projet.",
  "Commit or discard pending changes before validation.": "Enregistrez les modifications en attente dans Git ou annulez-les avant la validation.",
  "No committed ticket revision is available for validation.": "Aucune version enregistrée du code du ticket n’est disponible pour la validation.",
  "Cannot verify the current remote ticket revision.": "Impossible de vérifier la version distante actuelle du ticket.",
  "The ticket branch is no longer available on the remote.": "La branche du ticket n’est plus disponible dans le dépôt distant.",
  "Ticket branch is unavailable.": "La branche du ticket est indisponible.",
  "Cannot inspect the project remote.": "Impossible d’inspecter le dépôt distant du projet.",
  "Validation port allocation failed.": "L’attribution d’un port pour la validation a échoué.",
  "Validation workspace cleanup timed out.": "Le délai de nettoyage de la copie de validation est dépassé.",
  "Quality validation is unavailable.": "La validation est indisponible.",
  "Ticket not found.": "Le ticket est introuvable.",
  "Quality validation is available for feature tickets only.": "La validation est disponible uniquement pour les tickets de fonctionnalité.",
  "Evidence artifact is unavailable.": "La pièce jointe de la preuve est indisponible.",
  "Evidence artifact exceeds the download limit.": "La pièce jointe de la preuve dépasse la taille maximale de téléchargement.",
};

const QUALITY_MESSAGE_PREFIXES = [
  { source: "Acceptance criterion is unverified: ", target: "Critère d’acceptation non vérifié : " },
  { source: "Required browser tools are unavailable: ", target: "Les outils de navigateur requis sont indisponibles : " },
  { source: "Isolated application did not become healthy. ", target: "L’application isolée n’est pas devenue disponible. " },
  { source: "Dependency installation failed. ", target: "L’installation des dépendances du projet a échoué. " },
];
const PLAYWRIGHT_STARTUP_MESSAGE = /^Playwright MCP (\S+) must be installed locally before behavioral validation\.( Automatic downloads are disabled\.)?(?: ([\s\S]*))?$/;
const PREPARATION_FAILURE_PREFIX = "Validation environment preparation failed: ";
const SIMULATED_CRITERION_ID = "SIMULATED";
const SIMULATED_CRITERION_TEXT = "Simulation only: independent acceptance has not been verified.";
const SIMULATED_CRITERION_LABEL = "Simulation uniquement : les critères d’acceptation n’ont pas été vérifiés indépendamment.";
const UNVERIFIED_CRITERION_PREFIX = "Acceptance criterion is unverified: ";
const SIMULATED_VALIDATION_MESSAGE = "Simulation does not produce independent validation evidence.";
const SIMULATED_VALIDATION_OUTPUT = "This simulated run did not inspect committed source or execute independent validation.";
const QUALITY_PHASE_LABELS: Record<QualityRunPhase, string> = {
  planning: "Préparation des critères",
  preparing: "Préparation et installation du projet",
  checks: "Contrôles techniques",
  validating: "Validation indépendante des résultats",
  cleanup: "Nettoyage de la copie de validation",
};
const QUALITY_FAILURE_LABELS: Record<QualityRunPhase, string> = {
  planning: "Préparation des critères bloquée",
  preparing: "Préparation du projet bloquée",
  checks: "Échec des contrôles techniques",
  validating: "Validation indépendante en échec",
  cleanup: "Nettoyage incomplet",
};

export function formatQualityMessage(message: string): string {
  const translated = QUALITY_MESSAGES[message];
  if (typeof translated === "string") return translated;
  if (message.startsWith(PREPARATION_FAILURE_PREFIX)) return `La préparation de l’environnement de validation a échoué : ${formatQualityMessage(message.slice(PREPARATION_FAILURE_PREFIX.length))}`;
  for (const prefix of QUALITY_MESSAGE_PREFIXES) {
    if (message.startsWith(prefix.source)) return prefix.target + message.slice(prefix.source.length);
  }
  const startup = PLAYWRIGHT_STARTUP_MESSAGE.exec(message);
  const version = startup?.[1];
  if (startup === null || version === undefined) return message;
  let result = `Playwright MCP ${version} doit être installé localement avant la validation des parcours.`;
  if (startup[2] !== undefined) result += " Les téléchargements automatiques sont désactivés.";
  if (startup[3] !== undefined) result += ` ${formatQualityMessage(startup[3])}`;
  return result;
}

export function qualityErrorMessage(error: unknown): string {
  return formatQualityMessage(errorMessage(error));
}

export function formatQualityEvidenceSummary(evidence: Pick<QualityEvidence, "authority" | "summary">, simulated = false): string {
  if (evidence.authority === "human" && evidence.summary === "User observation") return "Observation de l’utilisateur";
  if (evidence.authority === "server" && evidence.summary === "Environment setup") return "Préparation de l’environnement";
  if (evidence.authority === "server" && evidence.summary === "Dependency installation") return "Installation des dépendances";
  if (simulated && evidence.authority === "agent" && evidence.summary === SIMULATED_VALIDATION_MESSAGE) return formatQualityMessage(evidence.summary);
  return evidence.summary;
}

export function formatQualityEvidenceOutput(evidence: Pick<QualityEvidence, "authority" | "kind" | "output">, simulated: boolean): string {
  if (simulated && evidence.authority === "agent" && evidence.kind === "behavior" && evidence.output === SIMULATED_VALIDATION_OUTPUT) return "Cette simulation n’a pas inspecté la version du code ni exécuté de validation indépendante.";
  return evidence.output;
}

export function formatQualityCriterionText(criterion: Pick<QualityCriterion, "id" | "text">, creator: QualityCriteriaSnapshot["createdBy"]): string {
  if (creator === "system" && criterion.id === SIMULATED_CRITERION_ID && criterion.text === SIMULATED_CRITERION_TEXT) return SIMULATED_CRITERION_LABEL;
  return criterion.text;
}

export function formatQualityGateMessage(message: string, quality: Pick<TicketQuality, "criteriaSnapshots">): string {
  const snapshot = quality.criteriaSnapshots.at(-1);
  const criterion = snapshot?.criteria.find((item) => message === UNVERIFIED_CRITERION_PREFIX + item.text);
  if (snapshot !== undefined && criterion !== undefined) return `Critère d’acceptation non vérifié : ${formatQualityCriterionText(criterion, snapshot.createdBy)}`;
  return formatQualityMessage(message);
}

export function formatQualityEnvironmentLabel(label: string): string {
  return label === "Validation application" ? "Application à valider" : label;
}

export function qualityModeLabel(mode: QualityValidationMode | null): string {
  if (mode === "repository") return "Dépôt du projet";
  if (mode === "browser") return "Application dans le navigateur";
  return "Périmètre à déterminer";
}

export function qualityRunTitle(run: Pick<QualityValidationRun, "kind" | "mode">): string {
  if (run.kind === "checks") return "Contrôles techniques";
  if (run.kind === "full") return "Vérification complète du ticket";
  if (run.mode === "repository") return "Validation du dépôt";
  return "Validation des parcours";
}

export function qualityPhaseLabel(phase: QualityRunPhase): string {
  return QUALITY_PHASE_LABELS[phase];
}

export function qualityFailureLabel(phase: QualityRunPhase): string {
  return QUALITY_FAILURE_LABELS[phase];
}
