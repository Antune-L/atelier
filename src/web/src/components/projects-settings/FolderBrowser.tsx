import { ArrowUp, Folder } from "lucide-react";
import { useRef, useState } from "react";

import type { FolderListing } from "@shared/folderBrowser";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

interface FolderBrowserProps {
  initialListing: FolderListing;
  onClose: () => void;
  onChoose: (path: string) => void;
}

export function FolderBrowser({ initialListing, onClose, onChoose }: FolderBrowserProps) {
  const [listing, setListing] = useState(initialListing);
  const [path, setPath] = useState(initialListing.path);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const close = (): void => {
    generation.current += 1;
    onClose();
  };

  const navigate = async (target: string): Promise<void> => {
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const next = await api.browseFolders(target);
      if (current !== generation.current) return;
      setListing(next);
      setPath(next.path);
    } catch (failure) {
      if (current === generation.current) setError(errorMessage(failure));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open) close(); }}
      title="Choisir un dossier"
      description="Dossiers de la machine qui héberge Atelier."
      footer={<>
        <Button variant="ghost" onClick={close}>Annuler</Button>
        <Button disabled={loading || path !== listing.path} onClick={() => onChoose(listing.path)}>Choisir ce dossier</Button>
      </>}
    >
      <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void navigate(path); }}>
        <Input aria-label="Dossier à parcourir" value={path} onChange={(event) => setPath(event.target.value)} />
        <Button type="submit" variant="outline" disabled={loading}>Ouvrir</Button>
      </form>
      {error !== null && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={loading || listing.parent === null} onClick={() => { if (listing.parent !== null) void navigate(listing.parent); }}>
          <ArrowUp className="h-4 w-4" /> Dossier parent
        </Button>
        <span className="min-w-0 break-all text-xs text-muted-foreground">{listing.path}</span>
      </div>
      <div aria-busy={loading} className="flex max-h-72 flex-col overflow-y-auto rounded-md border">
        {loading && <p role="status" className="p-3 text-sm text-muted-foreground">Chargement…</p>}
        {!loading && listing.entries.length === 0 && <p className="p-3 text-sm text-muted-foreground">Aucun sous-dossier.</p>}
        {!loading && listing.entries.map((entry) => (
          <button key={entry.path} type="button" className="flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent" onClick={() => void navigate(entry.path)}>
            <Folder className="h-4 w-4 shrink-0" /><span className="break-all">{entry.name}</span>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
