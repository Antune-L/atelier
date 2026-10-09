import { latestAcceptanceSnapshot } from "@shared/quality";
import type { QualityCriteriaSnapshot, QualityCriterion, QualityEvidence, QualityFunctionalBlockerCode, QualityPermissionBlockReason, QualityRunPhase, QualityValidationMode, QualityValidationRun, TicketQuality } from "@shared/quality";

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
  "A quality iteration is already active for this ticket.": "Un cycle de correction ou de reprise est déjà en cours pour ce ticket.",
  "A quality iteration is already active for this ticket": "Un cycle de correction ou de reprise est déjà en cours pour ce ticket.",
  "A quality iteration is already active for this PR": "Un cycle de correction ou de reprise est déjà en cours pour cette PR.",
  "A quality run or iteration is already active for this ticket.": "Une validation, une correction ou une reprise est déjà en cours pour ce ticket.",
  "No incomplete or contradicted full validation is available for iteration.": "Aucune vérification complète bloquée ou présentant un écart démontré n’est disponible pour lancer un cycle.",
  "Observed code nonconformance requires correction before full verification.": "Un écart démontré nécessite une correction avant la nouvelle vérification complète.",
  "No required criterion has an attributed code nonconformance.": "Aucun critère requis ne présente d’écart démontré par le validateur indépendant.",
  "Quality correction is unavailable.": "La correction est indisponible dans cette instance de l’application.",
  "The source validation is no longer the latest full run.": "Une vérification complète plus récente existe. Actualisez les résultats avant de lancer un cycle.",
  "The ticket or acceptance criteria changed after the source validation.": "Le ticket ou les critères ont changé. Lancez une nouvelle vérification complète avant de demander une correction ou une reprise.",
  "Validation configuration changed after the source validation.": "La configuration de validation a changé. Lancez une nouvelle vérification complète avant de demander une correction ou une reprise.",
  "The current source revision no longer matches the validation to iterate.": "Le code a changé. Lancez une nouvelle vérification complète de la version actuelle.",
  "Correction requires the existing open pull request and its branch.": "La correction nécessite la PR existante ouverte et sa branche. Vérifiez leur disponibilité.",
  "The existing pull request is closed, merged, unavailable, or no longer targets the ticket branch.": "La PR existante est fermée, fusionnée, indisponible ou ne correspond plus à la branche du ticket. Vérifiez son état avant de corriger.",
  "The open pull request head no longer matches the source validation.": "Le code de la PR a changé. Lancez une nouvelle vérification complète avant de demander une correction.",
  "The requested iteration does not match the source validation diagnostic.": "Cette action ne correspond plus au diagnostic de validation. Actualisez les résultats.",
  "The correction iteration is not ready for independent verification.": "La correction n’est pas prête pour une nouvelle vérification indépendante.",
  "The validated revision changed before recovery started.": "Le code a changé avant le démarrage de la reprise. Lancez une nouvelle vérification complète de la version actuelle.",
  "Quality iteration cancelled.": "Le cycle a été annulé.",
  "Quality iteration ticket not found": "Le ticket du cycle est introuvable.",
  "Quality iteration source run does not belong to the ticket": "La validation de départ ne correspond pas à ce ticket.",
  "Quality iteration requires a completed source run": "Attendez la fin de la validation avant de lancer un cycle.",
  "Quality iteration requires the latest full validation run": "Une vérification complète plus récente existe. Actualisez les résultats avant de lancer un cycle.",
  "Quality iteration source criteria are stale": "Les critères ont changé. Lancez une nouvelle vérification complète.",
  "Quality iteration source ticket or PRD changed": "Le ticket ou le PRD a changé. Lancez une nouvelle vérification complète.",
  "Quality iteration source validation mode does not match its criteria": "Le périmètre de validation ne correspond plus aux critères. Lancez une nouvelle vérification complète.",
  "Quality iteration retry requires a terminal predecessor for the same source and mode": "La tentative précédente doit être arrêtée et correspondre à cette validation et à cette action.",
  "Quality iteration PR does not match the ticket": "La PR du cycle ne correspond pas à celle du ticket.",
  "The latest full independent verification has not accepted every required criterion.": "La dernière vérification complète indépendante n’a pas validé tous les critères requis.",
  "Finish the interactive test session before starting a quality iteration.": "Terminez la session de test interactive avant de lancer une correction ou une reprise de validation.",
  "Quality correction is still running.": "La correction est toujours en cours.",
  "Another implementation session owns this ticket worktree; quality iteration is unavailable.": "Une autre session travaille dans la copie du projet de ce ticket. Attendez sa fin avant de lancer une correction ou une reprise.",
  "Independent correction verification must use the ticket's assigned worktree.": "La vérification indépendante doit utiliser la copie du projet attribuée à ce ticket.",
  "The ticket or validation configuration changed during the quality iteration.": "Le ticket ou la configuration de validation a changé pendant le cycle. Lancez une nouvelle vérification complète.",
  "The corrected revision changed before independent verification started.": "Le code corrigé a changé avant le démarrage de la vérification indépendante. Lancez une nouvelle vérification complète.",
  "The original requirements and execution settings are frozen during a quality iteration.": "Les exigences du ticket et les paramètres d’exécution sont verrouillés pendant la correction ou la reprise de validation.",
  "Use the dedicated quality correction or verification recovery action for this ticket.": "Utilisez l’action de correction ou de reprise dans l’onglet Validation de ce ticket.",
  "Quality criteria are frozen during a correction iteration": "Les critères sont verrouillés pendant la correction ou la reprise de validation.",
  "One or more server-run checks failed; source-code nonconformance is unconfirmed.": "Un ou plusieurs contrôles du serveur ont échoué. Cela ne démontre pas un défaut du code.",
  "Backend restarted before quality iteration completed.": "Le serveur a redémarré avant la fin de la correction ou de la reprise de validation.",
  "Ticket not found.": "Le ticket est introuvable.",
  "Quality validation is available for feature tickets only.": "La validation est disponible uniquement pour les tickets de fonctionnalité.",
  "Evidence artifact is unavailable.": "La pièce jointe de la preuve est indisponible.",
  "Evidence artifact exceeds the download limit.": "La pièce jointe de la preuve dépasse la taille maximale de téléchargement.",
  "No completed real technical check failure is available for correction.": "Aucun échec réel et terminé des contrôles techniques n’est disponible pour une correction.",
  "The same technical checks still fail after a correction attempt; inspect the evidence or create a correction card.": "Les mêmes contrôles échouent encore après une tentative de correction ; consultez les preuves ou créez une carte de correction.",
  "The same read blocker persisted after a recovery attempt with the same code and permissions; inspect the evidence or create a correction card.": "Le même blocage persiste après une reprise sur le même code avec les mêmes permissions ; consultez les preuves ou créez une carte de correction.",
  "The source technical run is no longer the latest technical run.": "Les contrôles source ne sont plus les plus récents.",
  "The source run has no recorded technical check failure.": "Cette exécution n’a enregistré aucun échec des contrôles techniques.",
  "The source run has no recorded read blocker.": "Cette exécution n’a enregistré aucun blocage de lecture.",
  "Unknown target project for the correction card.": "Projet cible inconnu pour la carte de correction.",
  "Simulated runs cannot create correction cards.": "Une simulation ne peut pas créer de carte de correction.",
  "The source run is still running or does not belong to this ticket.": "L’exécution source est encore en cours ou n’appartient pas à ce ticket.",
  "The source run is no longer the latest run for this issue; refresh the validation before creating a correction card.": "L’exécution source n’est plus la plus récente pour ce problème ; actualisez la validation avant de créer une carte de correction.",
  "The same browser scenarios still fail after a functional correction; inspect the evidence or create a correction card.": "Les mêmes scénarios échouent encore dans le navigateur après une correction ; consultez les preuves ou créez une carte de correction.",
  "No completed real functional test with a failed required scenario is available for correction.": "Aucun test fonctionnel réel et terminé avec un scénario requis en échec n’est disponible pour une correction.",
  "The source run has no failed or unverified functional scenario nor environment blocker.": "Cette exécution n’a enregistré aucun scénario en échec ou non vérifié, ni blocage d’environnement.",
  "The source functional test is no longer the latest functional test.": "Le test fonctionnel source n’est plus le plus récent.",
  "Ticket changed while functional scenarios were being prepared.": "Le ticket a changé pendant la préparation des scénarios du test fonctionnel.",
  "Acceptance criteria changed while functional scenarios were being prepared.": "Les critères d’acceptation ont changé pendant la préparation des scénarios du test fonctionnel.",
  "Some required functional scenarios were not verified in the browser.": "Certains scénarios requis n’ont pas été vérifiés dans le navigateur.",
  "Required browser scenarios were contradicted by attributed observations.": "Des observations attribuées contredisent des scénarios requis dans le navigateur.",
  "Some browser scenarios could not be exercised in the validation environment.": "Certains scénarios n’ont pas pu être exécutés dans le navigateur de l’environnement de validation.",
  "Functional scenarios cannot cite server check evidence": "Un scénario fonctionnel ne peut pas s’appuyer sur les contrôles du serveur.",
  "No recorded user interaction supports this interactive scenario": "Aucune interaction enregistrée ne justifie ce scénario interactif.",
  "No eligible viewport or element screenshot of this run supports this visual result": "Aucune capture d’écran recevable (zone visible ou élément) de cette exécution ne justifie ce résultat visuel.",
  "Validation cancelled before scenario preparation": "La validation a été annulée avant la préparation des scénarios.",
  "Scenario preparation did not return valid scenarios": "La préparation des scénarios n’a pas renvoyé de scénarios valides.",
};

const QUALITY_FUNCTIONAL_BLOCKER_LABELS: Record<QualityFunctionalBlockerCode, string> = {
  start_configuration_missing: "Configuration de démarrage manquante",
  environment_setup_failed: "Préparation de l’environnement en échec",
  dependency_installation_failed: "Installation des dépendances en échec",
  application_unavailable: "Application indisponible",
  browser_unavailable: "Navigateur indisponible",
  authentication_required: "Connexion requise",
  test_data_missing: "Données de test manquantes",
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
const QUALITY_PERMISSION_BLOCK_MESSAGES: Record<QualityPermissionBlockReason, { reason: string; nextStep: string }> = {
  invalid_tool_input: { reason: "Les paramètres de l’outil de lecture sont invalides.", nextStep: "Corriger le format des paramètres de lecture avant une nouvelle tentative." },
  unsupported_read_tool: { reason: "L’outil de lecture demandé n’est pas autorisé.", nextStep: "Utiliser une lecture directe ou une recherche simple prise en charge par le validateur." },
  path_outside_workspace: { reason: "Un chemin demandé sort de la copie de validation.", nextStep: "Limiter la lecture aux fichiers de la copie de validation du projet." },
  path_unresolvable: { reason: "Le chemin ciblé n’a pas pu être résolu dans la copie de validation.", nextStep: "Utiliser un fichier existant avec un chemin explicite dans la copie de validation." },
  home_expansion: { reason: "Le caractère « ~ » est refusé dans les arguments de lecture.", nextStep: "Utiliser les outils de lecture pris en charge sans ce caractère dans leurs arguments." },
  unsafe_read_option: { reason: "Une option de lecture demandée n’est pas autorisée.", nextStep: "Retirer les options non autorisées et rechercher directement dans les fichiers du projet." },
  shell_expansion: { reason: "La commande demande le remplacement automatique d’une partie de ses arguments.", nextStep: "Utiliser des arguments littéraux, sans substitution de commande ou de variable." },
  shell_syntax: { reason: "La syntaxe de la commande n’est pas autorisée.", nextStep: "Vérifier les guillemets et utiliser une seule commande, sans rediriger son entrée ou sa sortie." },
  unquoted_glob: { reason: "Le motif de fichiers n’est pas entouré de guillemets.", nextStep: "Entourer le motif de fichiers de guillemets avant de relancer la lecture." },
  working_directory_mismatch: { reason: "La commande part d’un dossier non autorisé.", nextStep: "Exécuter la lecture depuis la copie de validation du projet." },
  command_not_allowlisted: { reason: "La commande de lecture n’est pas autorisée.", nextStep: "Utiliser une lecture directe ou une recherche simple prévue par le validateur." },
  workspace_unresolvable: { reason: "La racine de la copie de validation est introuvable ou illisible.", nextStep: "Vérifier le cycle de vie de la copie de validation avant de relancer." },
};
const UNKNOWN_PERMISSION_BLOCK_MESSAGE = { reason: "Le motif précis de ce refus n’a pas été enregistré.", nextStep: "La cause exacte de ce refus n’est pas disponible. Une nouvelle vérification conserve les mêmes autorisations." };

export function qualityPermissionBlockMessage(reason: QualityPermissionBlockReason | null): { reason: string; nextStep: string } {
  if (reason === null) return UNKNOWN_PERMISSION_BLOCK_MESSAGE;
  return QUALITY_PERMISSION_BLOCK_MESSAGES[reason];
}

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
  const snapshot = latestAcceptanceSnapshot(quality);
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
  if (run.kind === "functional") return "Test fonctionnel dans le navigateur";
  if (run.mode === "repository") return "Validation du dépôt";
  return "Validation des parcours";
}

export function qualityFunctionalBlockerLabel(code: QualityFunctionalBlockerCode): string {
  return QUALITY_FUNCTIONAL_BLOCKER_LABELS[code];
}

export function qualityPhaseLabel(phase: QualityRunPhase): string {
  return QUALITY_PHASE_LABELS[phase];
}

export function qualityFailureLabel(phase: QualityRunPhase): string {
  return QUALITY_FAILURE_LABELS[phase];
}
