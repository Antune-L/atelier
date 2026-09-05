import type { CodexEffort, CodexModel } from "@shared/constants";
import type { Profile } from "@shared/schemas";

interface CodexImplementerSelection {
  codexImplementerModel: CodexModel | null;
  codexImplementerEffort: CodexEffort | null;
  codexImplementerFast: boolean | null;
}

export function matchesCodexImplementer(
  profile: Profile,
  selection: CodexImplementerSelection,
): boolean {
  return profile.codexImplementerModel === selection.codexImplementerModel
    && profile.codexImplementerEffort === selection.codexImplementerEffort
    && profile.codexImplementerFast === selection.codexImplementerFast;
}
