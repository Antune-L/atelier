import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  closeLabel?: string;
}

const DEFAULT_CLOSE_LABEL = "OK";

/** Single-button notice (e.g. a refused move). For choices, use ConfirmPopover / ConfirmDialog instead. */
export function AlertDialog({ open, onClose, title, description, closeLabel = DEFAULT_CLOSE_LABEL }: AlertDialogProps) {
  const handleOpenChange = (next: boolean): void => {
    if (!next) onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      size="sm"
      title={title}
      description={description}
      footer={
        <Button size="sm" onClick={onClose}>
          {closeLabel}
        </Button>
      }
    />
  );
}
