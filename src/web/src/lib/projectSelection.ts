import type { ProjectInfo } from "@shared/schemas";

export function resolveProjectChoice(projects: ProjectInfo[], choice: string | null): string {
  if (choice !== null && projects.some((project) => project.key === choice)) return choice;
  return projects[0]?.key ?? "";
}
