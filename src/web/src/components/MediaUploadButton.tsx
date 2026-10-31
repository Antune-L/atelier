import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { uploadMediaReference } from "@/lib/paste";

const MEDIA_ACCEPT = "image/*,video/*";
const UPLOAD_ERROR = "Échec de l'upload";

interface MediaUploadButtonProps {
  onUploaded: (markdown: string) => void;
  onError: (message: string) => void;
}

export function MediaUploadButton({ onUploaded, onError }: MediaUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (input: HTMLInputElement): Promise<void> => {
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    const references: string[] = [];
    try {
      for (const file of files) references.push(await uploadMediaReference(file));
    } catch (error) {
      onError(errorMessage(error, UPLOAD_ERROR));
    }
    input.value = "";
    setUploading(false);
    if (references.length > 0) onUploaded(references.join("\n"));
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={MEDIA_ACCEPT}
        className="sr-only"
        aria-label="Ajouter des images ou vidéos"
        disabled={uploading}
        onChange={(event) => void upload(event.currentTarget)}
      />
      <Button type="button" variant="ghost" size="sm" className="self-start" disabled={uploading} onClick={() => inputRef.current?.click()}>
        <ImagePlus className="h-3.5 w-3.5" />
        {uploading ? "Ajout en cours…" : "Ajouter une image"}
      </Button>
    </>
  );
}
