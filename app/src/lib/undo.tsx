import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";

export interface UndoRegistration {
  label: string;
  description?: string;
  /**
   * Time in milliseconds before the action is committed.
   * Defaults to 5000ms.
   */
  ttlMs?: number;
  do: () => Promise<void> | void;
  undo: () => Promise<void> | void;
}

export interface UndoHandle {
  /**
   * Cancels any pending timers and dismisses the toast without committing.
   */
  dispose: () => void;
  /**
   * Programmatically trigger the undo flow (equivalent to the user clicking the button).
   */
  triggerUndo: () => Promise<void>;
}

export interface UndoDeferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

export class UndoCancelledError extends Error {
  constructor(message = "Action was undone before it completed") {
    super(message);
    this.name = "UndoCancelledError";
  }
}

export const isUndoError = (error: unknown): error is UndoCancelledError => {
  return error instanceof UndoCancelledError;
};

export const createUndoDeferred = (): UndoDeferred => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;

  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject,
  };
};

export const registerUndo = ({
  label,
  description,
  ttlMs = 5000,
  do: commit,
  undo,
}: UndoRegistration): UndoHandle => {
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dismissToast: () => void = () => undefined;

  const cleanup = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    dismissToast();
  };

  const performCommit = async () => {
    if (settled) return;
    settled = true;
    try {
      await commit();
    } catch (error) {
      console.error("Failed to commit undoable action", error);
    } finally {
      cleanup();
    }
  };

  const performUndo = async () => {
    if (settled) return;
    settled = true;
    try {
      await undo();
    } catch (error) {
      console.error("Failed to roll back undoable action", error);
    } finally {
      cleanup();
    }
  };

  const controller = toast({
    title: label,
    description,
    action: (
      <ToastAction altText="Undo last action" onClick={performUndo}>
        Undo
      </ToastAction>
    ),
  });

  dismissToast = controller?.dismiss ?? (() => undefined);

  timer = setTimeout(performCommit, ttlMs);

  return {
    dispose: () => {
      if (settled) {
        cleanup();
        return;
      }
      settled = true;
      cleanup();
    },
    triggerUndo: performUndo,
  };
};
