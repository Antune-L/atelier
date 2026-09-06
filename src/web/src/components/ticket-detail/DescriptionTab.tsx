import { useState } from "react";

import type { Ticket } from "@shared/schemas";

import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { handleMediaPaste } from "@/lib/paste";

interface DescriptionEdit {
  title: string;
  externalUrl: string;
  description: string;
}

interface DescriptionTabProps {
  ticket: Ticket;
  onSave: (edit: DescriptionEdit) => Promise<void>;
}

const TITLE_ID = "edit-title";
const EXTERNAL_URL_ID = "edit-external-url";
const DESCRIPTION_ID = "edit-description";

/** Always-editable ticket description form; the body text survives closing via a local draft. */
export function DescriptionTab({ ticket, onSave }: DescriptionTabProps) {
  const [title, setTitle] = useState(ticket.title);
  const [externalUrl, setExternalUrl] = useState(ticket.externalUrl ?? "");
  const [description, setDescription] = useLocalDraft(`description:${ticket.id}`);
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Render-phase seed: an untouched draft starts from the ticket's current description.
  if (!seeded) {
    setSeeded(true);
    if (description === "") setDescription(ticket.description);
  }

  const appendMarkdown = (markdown: string): void => {
    const separator = description.endsWith("\n") || description === "" ? "" : "\n";
    setDescription(`${description}${separator}${markdown}\n`);
  };

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    void handleMediaPaste(event, appendMarkdown).catch((e) =>
      setError(e instanceof Error ? e.message : "Échec de l'upload"),
    );
  };

  const cancel = (): void => {
    setTitle(ticket.title);
    setExternalUrl(ticket.externalUrl ?? "");
    setDescription(ticket.description);
    setError(null);
  };

  const save = async (): Promise<void> => {
    setError(null);
    try {
      await onSave({ title: title.trim(), externalUrl, description });
      // NOTE: the draft now mirrors what was persisted, so it is no longer unsent text.
      setDescription(description);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-3">
      <SectionHeader>Description</SectionHeader>
      <div className="space-y-1.5">
        <Label htmlFor={TITLE_ID}>Titre (optionnel)</Label>
        <Input
          id={TITLE_ID}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du ticket (déduit de la description si vide)"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={EXTERNAL_URL_ID}>Lien externe (optionnel)</Label>
        <Input
          id={EXTERNAL_URL_ID}
          type="url"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          placeholder="https://notion.so/… ou Trello"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={DESCRIPTION_ID}>Description (markdown)</Label>
        <Textarea
          id={DESCRIPTION_ID}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onPaste={onPaste}
          className="min-h-[320px]"
          placeholder="Description… (colle une image pour l'attacher ; liens Figma détectés automatiquement)"
        />
      </div>
      {error !== null && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void save()}>
          Enregistrer
        </Button>
        <Button size="sm" variant="outline" onClick={cancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
