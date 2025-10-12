import React, { useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePreference } from "@/lib/preferences";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
  preferenceKey?: string;
  dontShowLabel?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = 'default',
  loading = false,
  preferenceKey,
  dontShowLabel = "Don't show again",
}) => {
  const storageKey = preferenceKey ? `confirmation:${preferenceKey}` : "confirmation:__fallback";
  const [requireConfirmation, setRequireConfirmation] = usePreference(storageKey, true);

  const shouldRenderDialog = preferenceKey ? requireConfirmation : true;

  const autoConfirmRef = useRef(false);

  const handleConfirm = async () => {
    await onConfirm();
    autoConfirmRef.current = false;
  };

  useEffect(() => {
    if (!open || !preferenceKey || requireConfirmation || loading || autoConfirmRef.current) {
      return;
    }

    autoConfirmRef.current = true;

    (async () => {
      try {
        await handleConfirm();
      } finally {
        onOpenChange(false);
      }
    })();
  }, [open, preferenceKey, requireConfirmation, handleConfirm, loading, onOpenChange]);

  return (
    <AlertDialog open={open && shouldRenderDialog} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
        {preferenceKey && shouldRenderDialog && (
          <div className="mt-4 flex items-center gap-2">
            <Checkbox
              id={`${preferenceKey}-dont-show`}
              checked={!requireConfirmation}
              onCheckedChange={(checked) => setRequireConfirmation(!(checked === true))}
            />
            <Label htmlFor={`${preferenceKey}-dont-show`} className="text-sm">
              {dontShowLabel}
            </Label>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};
