import { z } from "zod";

export const PRD_SCHEMA_VERSION = 2;
export const PRD_MAX_AXES = 5;
export const PRD_IDENTIFIER_MAX_LENGTH = 100;
export const PRD_LOCALES = ["fr", "en"] as const;
export const PRD_REQUIREMENT_KINDS = ["functional", "non-functional"] as const;
export const PRD_REQUIREMENT_PRIORITIES = ["must", "should", "could"] as const;
export const PRD_REQUIREMENT_STATUSES = ["proposed", "approved", "deferred"] as const;

const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const AXIS_IDENTIFIER_PATTERN = /^A[1-9][0-9]*$/;
const TASK_IDENTIFIER_PATTERN = /^T[1-9][0-9]*$/;

const textSchema = z.string().refine((value) => value.trim().length > 0, { message: "texte non vide attendu" });
const identifierSchema = z.string().max(PRD_IDENTIFIER_MAX_LENGTH).regex(IDENTIFIER_PATTERN);
const axisIdSchema = z.string().regex(AXIS_IDENTIFIER_PATTERN);
const taskIdSchema = z.string().regex(TASK_IDENTIFIER_PATTERN);

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

const DUPLICATE_ITEMS_ISSUE = { message: "éléments en double interdits" };

function isUnique(values: readonly string[]): boolean {
  return !hasDuplicates(values);
}

const textArraySchema = z.array(textSchema).refine(isUnique, DUPLICATE_ITEMS_ISSUE);
const nonEmptyTextArraySchema = z.array(textSchema).min(1).refine(isUnique, DUPLICATE_ITEMS_ISSUE);
const taskDependenciesSchema = z.array(taskIdSchema).refine(isUnique, DUPLICATE_ITEMS_ISSUE);

const prdSourceSchema = z.strictObject({ title: textSchema, ref: textSchema });

const prdAxisSchema = z.strictObject({ id: axisIdSchema, title: textSchema, summary: textSchema });

const prdRequirementSchema = z.strictObject({
  id: identifierSchema,
  axis: axisIdSchema,
  kind: z.enum(PRD_REQUIREMENT_KINDS),
  title: textSchema,
  description: textSchema,
  priority: z.enum(PRD_REQUIREMENT_PRIORITIES),
  status: z.enum(PRD_REQUIREMENT_STATUSES),
  acceptance: nonEmptyTextArraySchema,
});

const prdTaskSchema = z.strictObject({
  id: taskIdSchema,
  axis: axisIdSchema,
  title: textSchema,
  expectedOutcome: textSchema,
  startCondition: textSchema,
  dependsOn: taskDependenciesSchema,
  acceptance: nonEmptyTextArraySchema,
  boundaries: nonEmptyTextArraySchema,
});

const prdPreDraftSchema = z.strictObject({
  reuse: textArraySchema,
  sharedSurfaces: textArraySchema,
  sourcePriority: nonEmptyTextArraySchema,
});

type PrdTaskShape = z.infer<typeof prdTaskSchema>;

function findDependencyCycle(tasks: readonly PrdTaskShape[]): string | null {
  const known = new Set(tasks.map((task) => task.id));
  const graph = new Map(tasks.map((task) => [task.id, task.dependsOn.filter((dependency) => known.has(dependency))]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (taskId: string): string | null => {
    if (visiting.has(taskId)) return taskId;
    if (visited.has(taskId)) return null;
    visiting.add(taskId);
    for (const dependency of graph.get(taskId) ?? []) {
      const cycle = visit(dependency);
      if (cycle !== null) return cycle;
    }
    visiting.delete(taskId);
    visited.add(taskId);
    return null;
  };
  for (const taskId of graph.keys()) {
    const cycle = visit(taskId);
    if (cycle !== null) return cycle;
  }
  return null;
}

export const prdDocumentSchema = z
  .strictObject({
    $schema: textSchema.optional(),
    schemaVersion: z.literal(PRD_SCHEMA_VERSION),
    id: identifierSchema,
    revision: textSchema,
    title: textSchema,
    summary: textSchema,
    locale: z.enum(PRD_LOCALES),
    preDraft: prdPreDraftSchema,
    goals: textArraySchema,
    axes: z.array(prdAxisSchema).min(1).max(PRD_MAX_AXES),
    sources: z.array(prdSourceSchema),
    users: textArraySchema,
    userStories: textArraySchema,
    requirements: z.array(prdRequirementSchema).min(1),
    designConsiderations: textArraySchema,
    successMetrics: textArraySchema,
    outOfScope: textArraySchema,
    openQuestions: textArraySchema,
    tasks: z.array(prdTaskSchema).min(1),
  })
  .superRefine((document, context) => {
    const axisIds = document.axes.map((axis) => axis.id);
    const knownAxes = new Set(axisIds);
    if (hasDuplicates(axisIds)) context.addIssue({ code: "custom", message: "identifiants d'axes en double", path: ["axes"] });
    if (hasDuplicates(document.sources.map((source) => `${source.title}\u0000${source.ref}`))) {
      context.addIssue({ code: "custom", message: "sources en double interdites", path: ["sources"] });
    }
    if (hasDuplicates(document.requirements.map((requirement) => requirement.id))) {
      context.addIssue({ code: "custom", message: "identifiants d'exigences en double", path: ["requirements"] });
    }
    const coveredAxes = new Set<string>();
    document.requirements.forEach((requirement, index) => {
      if (knownAxes.has(requirement.axis)) coveredAxes.add(requirement.axis);
      else context.addIssue({ code: "custom", message: `axe inconnu « ${requirement.axis} »`, path: ["requirements", index, "axis"] });
    });
    for (const axisId of axisIds) {
      if (!coveredAxes.has(axisId)) context.addIssue({ code: "custom", message: `l'axe « ${axisId} » n'a aucune exigence`, path: ["axes"] });
    }
    const taskIds = document.tasks.map((task) => task.id);
    const knownTasks = new Set(taskIds);
    if (hasDuplicates(taskIds)) context.addIssue({ code: "custom", message: "identifiants de tâches en double", path: ["tasks"] });
    document.tasks.forEach((task, index) => {
      if (!knownAxes.has(task.axis)) context.addIssue({ code: "custom", message: `axe inconnu « ${task.axis} »`, path: ["tasks", index, "axis"] });
      for (const dependency of task.dependsOn) {
        if (dependency === task.id) {
          context.addIssue({ code: "custom", message: "une tâche ne peut pas dépendre d'elle-même", path: ["tasks", index, "dependsOn"] });
        } else if (!knownTasks.has(dependency)) {
          context.addIssue({ code: "custom", message: `tâche inconnue « ${dependency} »`, path: ["tasks", index, "dependsOn"] });
        }
      }
    });
    const cycle = findDependencyCycle(document.tasks);
    if (cycle !== null) context.addIssue({ code: "custom", message: `cycle de dépendances incluant « ${cycle} »`, path: ["tasks"] });
  });
export type PrdDocument = z.infer<typeof prdDocumentSchema>;
export type PrdAxis = PrdDocument["axes"][number];
export type PrdRequirement = PrdDocument["requirements"][number];
export type PrdTask = PrdDocument["tasks"][number];
