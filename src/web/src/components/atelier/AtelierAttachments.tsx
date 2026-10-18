import { Paperclip } from "lucide-react";
import { useRef, useState, type ClipboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { handleMediaPaste, uploadAttachment } from "@/lib/paste";

const ATTACHMENT_TYPES = ".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,.csv,.json,.yaml,.yml,.xml,.html,.log,.doc,.docx,.rtf,.odt";

export async function uploadAttachmentBatch(
  files: File[],
  appendText: (markdown: string) => void,
  uploadFile: (file: File) => Promise<string> = uploadAttachment,
): Promise<void> {
  const references: string[] = [];
  for (const file of files) references.push(await uploadFile(file));
  if (references.length > 0) appendText(references.join("\n"));
}

export async function uploadSelectedAttachments(
  input: Pick<HTMLInputElement, "files" | "value">,
  uploadFiles: (files: File[]) => Promise<boolean>,
): Promise<void> {
  const files = Array.from(input.files ?? []);
  if (files.length === 0) return;
  try {
    await uploadFiles(files);
  } finally {
    input.value = "";
  }
}

export function useAtelierAttachments(appendText: (markdown: string) => void, onError: (message: string) => void) {
  const [pending, setPending] = useState(0);

  const trackUpload = async <T,>(action: () => Promise<T>): Promise<T> => {
    setPending((count) => count + 1);
    try {
      return await action();
    } finally {
      setPending((count) => count - 1);
    }
  };

  const uploadFiles = async (files: File[]): Promise<boolean> => {
    try {
      await trackUpload(() => uploadAttachmentBatch(files, appendText));
      return true;
    } catch (error: unknown) {
      onError(errorMessage(error, "Échec de l’ajout de la pièce jointe"));
      return false;
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    void handleMediaPaste(event, appendText, (file) => trackUpload(() => api.uploadFile(file)))
      .catch((error: unknown) => onError(errorMessage(error, "Échec de l’ajout de la pièce jointe")));
  };

  return { uploading: pending > 0, uploadFiles, onPaste };
}

interface AtelierAttachmentsProps {
  uploading: boolean;
  disabled?: boolean;
  uploadFiles: (files: File[]) => Promise<boolean>;
}

export function AtelierAttachments({ uploading, disabled, uploadFiles }: AtelierAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_TYPES}
        className="sr-only"
        aria-label="Joindre des images ou documents"
        disabled={disabled || uploading}
        onChange={(event) => {
          void uploadSelectedAttachments(event.currentTarget, uploadFiles);
        }}
      />
      <Button size="sm" variant="outline" disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>
        <Paperclip className="h-3.5 w-3.5" />
        {uploading ? "Ajout en cours…" : "Joindre des fichiers"}
      </Button>
      {uploading && <span role="status" className="text-xs text-muted-foreground">Attendez la fin de l’ajout avant d’envoyer.</span>}
    </div>
  );
}
