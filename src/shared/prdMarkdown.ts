import type { PrdAxis, PrdDocument, PrdRequirement, PrdTask } from "./prdDocument.ts";

const LABELS = {
  revision: "révision",
  decisions: "Décisions attendues",
  need: "Le besoin",
  goals: "Objectifs",
  outOfScope: "Hors périmètre",
  axes: "Axes",
  requirements: "Exigences",
  axisRequirements: "Exigences de l'axe",
  tasks: "Tâches",
  context: "Contexte",
  users: "Utilisateurs",
  userStories: "User stories",
  designConsiderations: "Considérations de design",
  successMetrics: "Indicateurs de succès",
  sources: "Sources",
  preDraft: "Pré-cadrage",
  reuse: "Réutilisation",
  sharedSurfaces: "Surfaces partagées",
  sourcePriority: "Priorité des sources",
  expectedOutcome: "Résultat attendu",
  startCondition: "Condition de démarrage",
  dependsOn: "Dépend de",
  acceptance: "Critères d'acceptation",
  boundaries: "Limites",
  noneFeminine: "Aucune",
  noneMasculine: "Aucun",
} as const;

const SEPARATOR = " — ";
const META_SEPARATOR = " · ";
const LIST_SEPARATOR = ", ";
const H1 = 1;
const H2 = 2;
const H3 = 3;
const H4 = 4;

type Block = string[];

function heading(level: number, text: string): string {
  return `${"#".repeat(level)} ${text}`;
}

function bulletList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function listOrNone(items: readonly string[], none: string): string {
  return items.length > 0 ? bulletList(items) : none;
}

function section(level: number, title: string, body: string): Block {
  return [heading(level, title), body];
}

function labelledList(label: string, items: readonly string[]): string {
  return `**${label} :**\n${bulletList(items)}`;
}

function requirementTitle(requirement: PrdRequirement): string {
  return `${requirement.id}${SEPARATOR}${requirement.title} (${requirement.priority})`;
}

function taskTitle(task: PrdTask): string {
  return `${task.id}${SEPARATOR}${task.title}`;
}

function axisTitle(axis: PrdAxis): string {
  return `${axis.id}${SEPARATOR}${axis.title}`;
}

function renderRequirement(requirement: PrdRequirement, level: number): Block {
  return [heading(level, requirementTitle(requirement)), requirement.description, labelledList(LABELS.acceptance, requirement.acceptance)];
}

function renderDependencies(task: PrdTask): string {
  const dependencies = task.dependsOn.length > 0 ? task.dependsOn.join(LIST_SEPARATOR) : LABELS.noneFeminine;
  return `**${LABELS.dependsOn} :** ${dependencies}`;
}

function renderTaskBody(task: PrdTask): Block {
  return [
    `**${LABELS.expectedOutcome} :** ${task.expectedOutcome}`,
    `**${LABELS.startCondition} :** ${task.startCondition}`,
    renderDependencies(task),
    labelledList(LABELS.acceptance, task.acceptance),
    labelledList(LABELS.boundaries, task.boundaries),
  ];
}

function renderTask(task: PrdTask, level: number): Block {
  return [heading(level, taskTitle(task)), ...renderTaskBody(task)];
}

function renderAxisDetail(doc: PrdDocument, axis: PrdAxis): Block {
  const requirements = doc.requirements.filter((requirement) => requirement.axis === axis.id);
  const tasks = doc.tasks.filter((task) => task.axis === axis.id);
  const blocks: Block = [heading(H2, `${axis.id}${META_SEPARATOR}${axis.title}`), axis.summary];
  if (requirements.length > 0) {
    blocks.push(heading(H3, LABELS.requirements));
    for (const requirement of requirements) blocks.push(...renderRequirement(requirement, H4));
  }
  if (tasks.length > 0) {
    blocks.push(heading(H3, LABELS.tasks));
    for (const task of tasks) blocks.push(...renderTask(task, H4));
  }
  return blocks;
}

function renderContext(doc: PrdDocument): Block {
  const lists: [string, readonly string[]][] = [
    [LABELS.users, doc.users],
    [LABELS.userStories, doc.userStories],
    [LABELS.designConsiderations, doc.designConsiderations],
    [LABELS.successMetrics, doc.successMetrics],
    [LABELS.sources, doc.sources.map((source) => `${source.title}${SEPARATOR}${source.ref}`)],
  ];
  const blocks: Block = [];
  for (const [title, items] of lists) {
    if (items.length > 0) blocks.push(...section(H3, title, bulletList(items)));
  }
  const preDraft: [string, readonly string[]][] = [
    [LABELS.reuse, doc.preDraft.reuse],
    [LABELS.sharedSurfaces, doc.preDraft.sharedSurfaces],
    [LABELS.sourcePriority, doc.preDraft.sourcePriority],
  ];
  const preDraftBlocks = preDraft.filter(([, items]) => items.length > 0).map(([label, items]) => labelledList(label, items));
  if (preDraftBlocks.length > 0) blocks.push(heading(H3, LABELS.preDraft), ...preDraftBlocks);
  return blocks.length > 0 ? [heading(H2, LABELS.context), ...blocks] : [];
}

function joinBlocks(blocks: Block): string {
  return `${blocks.join("\n\n")}\n`;
}

function metaLine(doc: PrdDocument): string {
  return [doc.id, `${LABELS.revision} ${doc.revision}`, doc.locale].join(META_SEPARATOR);
}

function prdReference(doc: PrdDocument): string {
  return `« ${doc.title} » (${doc.id}, ${LABELS.revision} ${doc.revision})`;
}

export function renderPrdMarkdown(doc: PrdDocument): string {
  const need: Block = [heading(H2, LABELS.need), doc.summary];
  if (doc.goals.length > 0) need.push(...section(H3, LABELS.goals, bulletList(doc.goals)));
  const blocks: Block = [
    heading(H1, doc.title),
    metaLine(doc),
    ...section(H2, LABELS.decisions, listOrNone(doc.openQuestions, LABELS.noneFeminine)),
    ...need,
    ...section(H2, LABELS.outOfScope, listOrNone(doc.outOfScope, LABELS.noneMasculine)),
    ...section(H2, LABELS.axes, bulletList(doc.axes.map((axis) => `**${axisTitle(axis)}**${SEPARATOR}${axis.summary}`))),
  ];
  for (const axis of doc.axes) blocks.push(...renderAxisDetail(doc, axis));
  blocks.push(...renderContext(doc));
  return joinBlocks(blocks);
}

export function renderPrdTaskBrief(doc: PrdDocument, taskId: string): string | null {
  const task = doc.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return null;
  const axis = doc.axes.find((candidate) => candidate.id === task.axis);
  const axisLabel = axis ? `, axe ${axisTitle(axis)}` : "";
  const requirements = doc.requirements.filter((requirement) => requirement.axis === task.axis);
  const blocks: Block = [
    heading(H1, taskTitle(task)),
    `Tâche extraite du PRD ${prdReference(doc)}${axisLabel}. Le PRD complet est disponible dans l'onglet PRD de la carte.`,
    ...renderTaskBody(task),
  ];
  if (requirements.length > 0) {
    blocks.push(heading(H2, LABELS.axisRequirements));
    for (const requirement of requirements) blocks.push(...renderRequirement(requirement, H3));
  }
  return joinBlocks(blocks);
}

export function renderPrdAxisBrief(doc: PrdDocument, axisId: string): string | null {
  const axis = doc.axes.find((candidate) => candidate.id === axisId);
  if (!axis) return null;
  const requirements = doc.requirements.filter((requirement) => requirement.axis === axis.id);
  const tasks = doc.tasks.filter((task) => task.axis === axis.id);
  const blocks: Block = [
    heading(H1, axisTitle(axis)),
    `Axe extrait du PRD ${prdReference(doc)}. Le PRD complet est disponible dans l'onglet PRD de la carte.`,
    axis.summary,
  ];
  if (requirements.length > 0) {
    blocks.push(heading(H2, LABELS.requirements));
    for (const requirement of requirements) blocks.push(...renderRequirement(requirement, H3));
  }
  if (tasks.length > 0) {
    blocks.push(heading(H2, LABELS.tasks));
    for (const task of tasks) blocks.push(...renderTask(task, H3));
  }
  return joinBlocks(blocks);
}
