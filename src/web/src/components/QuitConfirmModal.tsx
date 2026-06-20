import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";

interface QuitConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}

/** Double ⌘W (no terminal left to close) — confirm before quitting the desktop app. */
export function QuitConfirmModal({
  open,
  onClose,
  onConfirm,
  confirming = false,
}: QuitConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader>
        <ModalTitle>Quitter l&apos;application ?</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p className="text-sm text-muted-foreground">
          Les sessions terminal ouvertes seront terminées et le serveur local sera arrêté.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={confirming}>
          Annuler
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} disabled={confirming}>
          {confirming ? "Fermeture…" : "Quitter"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
