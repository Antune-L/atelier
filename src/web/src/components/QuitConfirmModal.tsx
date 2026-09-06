import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface QuitConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}

const QUIT_LABEL = "Quitter";
const QUIT_BUSY_LABEL = "Fermeture…";

/** Double ⌘W (no terminal left to close) — confirm before quitting the desktop app. */
export function QuitConfirmModal({
  open,
  onClose,
  onConfirm,
  confirming = false,
}: QuitConfirmModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      size="sm"
      blocking={confirming}
      title="Quitter l'application ?"
      description="Les sessions terminal ouvertes seront terminées et le serveur local sera arrêté."
      footer={
        <>
          <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={confirming}>
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? QUIT_BUSY_LABEL : QUIT_LABEL}
          </Button>
        </>
      }
    />
  );
}
