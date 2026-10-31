import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/settings";
import { patchAppSettings, useAppSettings } from "@/hooks/useAppSettings";
import { useProfiles } from "@/hooks/useProfiles";
import { useProjects } from "@/hooks/useProjects";
import { agentPairLabel } from "@/lib/display";
import { matchesQuery } from "@/lib/search";

const NO_PROFILE_VALUE = "";
const PROJECTS_LABEL = "Projets exposés";
const PROFILE_LABEL = "Profil des cartes distantes";

export function RemoteMcpSettings({ query = "" }: { query?: string }) {
  const { settings, error, saved } = useAppSettings();
  const projects = useProjects();
  const profiles = useProfiles();
  const showProjects = matchesQuery(query, PROJECTS_LABEL, "projet autorisé liste distant");
  const showProfile = matchesQuery(query, PROFILE_LABEL, "profil pilote implémenteur distant");

  if (settings === null) return <p className="text-sm text-muted-foreground">Chargement des réglages…</p>;
  const allowed = new Set(settings.remoteMcpProjectIds);
  const toggleProject = (key: string, checked: boolean): void => {
    const next = checked ? [...allowed, key] : [...allowed].filter((id) => id !== key);
    void patchAppSettings({ remoteMcpProjectIds: next });
  };
  const selectedProfileMissing = settings.remoteMcpCardsProfileId !== null && !profiles.some((profile) => profile.id === settings.remoteMcpCardsProfileId);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="MCP distant"
        subtitle="Clients distants : lecture des projets autorisés et création de cartes À faire. Sur le Mac, ces projets et ce profil servent aussi aux cartes envoyées depuis la boîte d'envoi du VPS. Une carte distante ne démarre qu'après ton approbation."
      />
      {showProjects && (
        <fieldset className="space-y-2 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">{PROJECTS_LABEL}</legend>
          <p className="text-xs text-muted-foreground">Aucun projet coché : tout est refusé. Un nouveau projet n'est jamais exposé par défaut.</p>
          {projects.length === 0 ? <p className="text-sm text-muted-foreground">Aucun projet configuré.</p> : (
            <div className="flex flex-col gap-1.5">
              {projects.map((project) => (
                <label key={project.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allowed.has(project.key)}
                    onChange={(event) => toggleProject(project.key, event.target.checked)}
                  />
                  <span>{project.label}</span>
                  <span className="font-mono text-2xs text-muted-foreground">{project.key}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}
      {showProfile && (
        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="remote-mcp-profile">{PROFILE_LABEL}</Label>
          <p className="text-xs text-muted-foreground">Pilote et implémenteur copiés tels quels sur chaque carte créée à distance. Sans profil, la création distante est refusée.</p>
          <Select
            id="remote-mcp-profile"
            className="w-full max-w-sm"
            value={settings.remoteMcpCardsProfileId ?? NO_PROFILE_VALUE}
            onChange={(event) => void patchAppSettings({ remoteMcpCardsProfileId: event.target.value === NO_PROFILE_VALUE ? null : event.target.value })}
          >
            <option value={NO_PROFILE_VALUE}>Aucun (création refusée)</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name} · {agentPairLabel(profile.orchestrator, profile.implementer)}
              </option>
            ))}
          </Select>
          {selectedProfileMissing && <p className="text-xs text-warning">Le profil sélectionné est introuvable.</p>}
        </div>
      )}
      {!showProjects && !showProfile && <p className="text-sm text-muted-foreground">Aucun réglage ne correspond à cette recherche.</p>}
      {saved && <p className="text-xs text-success" role="status">Enregistré</p>}
      {error !== null && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
