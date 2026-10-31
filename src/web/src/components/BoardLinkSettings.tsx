import { useState } from "react";
import type { ZodType } from "zod";

import { BOARD_NAME_MAX_LENGTH, boardNameSchema, dnsHostnameSchema, otherBoardUrlSchema, sshHostAliasSchema } from "@shared/boardLink";
import type { AppSettings, UpdateAppSettingsInput } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SectionHeader, SettingsFooter } from "@/components/ui/settings";
import { patchAppSettings, useAppSettings } from "@/hooks/useAppSettings";
import { useCapabilities } from "@/hooks/useCapabilities";
import { matchesQuery } from "@/lib/search";

type BoardLinkField = "boardName" | "otherBoardUrl" | "sshHostAlias" | "publicHostname";
type BoardLinkDraft = Record<BoardLinkField, string>;

interface FieldSpec {
  field: BoardLinkField;
  label: string;
  hint: string;
  placeholder: string;
  invalidMessage: string;
  schema: ZodType<string, string>;
  macOnly: boolean;
  keywords: string;
}

const FIELD_SPECS: FieldSpec[] = [
  {
    field: "boardName",
    label: "Nom de ce board",
    hint: "Affiché dans la navigation pour distinguer le Mac du VPS.",
    placeholder: "Mac",
    invalidMessage: `Nom de ${BOARD_NAME_MAX_LENGTH} caractères au plus.`,
    schema: boardNameSchema,
    macOnly: false,
    keywords: "nom board identité",
  },
  {
    field: "otherBoardUrl",
    label: "Adresse de l'autre board",
    hint: "Ouverte par « Ouvrir l'autre board ». HTTPS uniquement, sans identifiant ni mot de passe.",
    placeholder: "https://kanban.example.com",
    invalidMessage: "Adresse HTTPS valide requise, sans identifiant ni mot de passe.",
    schema: otherBoardUrlSchema,
    macOnly: false,
    keywords: "url adresse autre board vps mac lien https",
  },
  {
    field: "sshHostAlias",
    label: "Alias SSH du VPS",
    hint: "Alias défini dans ~/.ssh/config sur ce Mac. Aucune clé n'est stockée ici.",
    placeholder: "kanban-vps",
    invalidMessage: "Alias SSH invalide : lettres, chiffres, point, tiret ou souligné, sans tiret au début.",
    schema: sshHostAliasSchema,
    macOnly: true,
    keywords: "ssh alias vps",
  },
  {
    field: "publicHostname",
    label: "Nom public de ce Mac",
    hint: "Nom d'hôte du tunnel Cloudflare, accepté par le board au prochain lancement de l'application.",
    placeholder: "mac.example.com",
    invalidMessage: "Nom d'hôte DNS requis, sans https:// ni chemin.",
    schema: dnsHostnameSchema,
    macOnly: true,
    keywords: "nom public hôte tunnel cloudflare téléphone dev_host",
  },
];

function draftFromSettings(settings: AppSettings): BoardLinkDraft {
  return {
    boardName: settings.boardName ?? "",
    otherBoardUrl: settings.otherBoardUrl ?? "",
    sshHostAlias: settings.sshHostAlias ?? "",
    publicHostname: settings.publicHostname ?? "",
  };
}

function isFieldValid(spec: FieldSpec, value: string): boolean {
  return value.trim() === "" || spec.schema.safeParse(value).success;
}

export function BoardLinkSettings({ query = "" }: { query?: string }) {
  const { settings, error, saved } = useAppSettings();
  const { cloudHost } = useCapabilities();
  if (settings === null) return <p className="text-sm text-muted-foreground">Chargement des réglages…</p>;
  const specs = FIELD_SPECS.filter((spec) => !(spec.macOnly && cloudHost) && matchesQuery(query, spec.label, spec.keywords));
  const savedDraft = draftFromSettings(settings);
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Liaison des boards"
        subtitle="Identité de ce board et accès à l'autre board (Mac ou VPS). Aucun secret n'est enregistré ici."
      />
      {specs.length === 0
        ? <p className="text-sm text-muted-foreground">Aucun réglage ne correspond à cette recherche.</p>
        : <BoardLinkForm key={JSON.stringify(savedDraft)} specs={specs} savedDraft={savedDraft} justSaved={saved} />}
      {error !== null && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

interface BoardLinkFormProps {
  specs: FieldSpec[];
  savedDraft: BoardLinkDraft;
  justSaved: boolean;
}

function BoardLinkForm({ specs, savedDraft, justSaved }: BoardLinkFormProps) {
  const { activePublicHostname } = useCapabilities();
  const [draft, setDraft] = useState<BoardLinkDraft>(savedDraft);
  const changed = specs.filter((spec) => draft[spec.field] !== savedDraft[spec.field]);
  const invalid = specs.some((spec) => !isFieldValid(spec, draft[spec.field]));
  const hostnameRestartPending = specs.some((spec) => spec.field === "publicHostname")
    && (savedDraft.publicHostname || null) !== activePublicHostname;

  const save = (): void => {
    const patch: UpdateAppSettingsInput = {};
    for (const spec of changed) {
      const value = draft[spec.field].trim();
      patch[spec.field] = value === "" ? null : value;
    }
    void patchAppSettings(patch);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      {specs.map((spec) => {
        const id = `board-link-${spec.field}`;
        const valid = isFieldValid(spec, draft[spec.field]);
        return (
          <div key={spec.field} className="space-y-1.5">
            <Label htmlFor={id}>{spec.label}</Label>
            <Input
              id={id}
              value={draft[spec.field]}
              onChange={(event) => setDraft({ ...draft, [spec.field]: event.target.value })}
              placeholder={spec.placeholder}
              aria-invalid={!valid}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">{spec.hint}</p>
            {!valid && <p className="text-xs text-destructive" role="alert">{spec.invalidMessage}</p>}
          </div>
        );
      })}
      {hostnameRestartPending && (
        <p className="text-xs text-warning" role="status">
          Redémarrez l'application Atelier pour appliquer le nom public. Actif : {activePublicHostname ?? "aucun"}.
        </p>
      )}
      <SettingsFooter dirty={changed.length > 0} justSaved={justSaved}>
        <Button size="sm" variant="outline" disabled={changed.length === 0} onClick={() => setDraft(savedDraft)}>Annuler</Button>
        <Button size="sm" disabled={changed.length === 0 || invalid} onClick={save}>Enregistrer</Button>
      </SettingsFooter>
    </div>
  );
}
