import { useCallback, useEffect, useReducer, useRef } from "react";
import { FriendlyErrorMessage, mapErrorToFriendlyMessage } from "@/lib/errorHandling";

export type UploadQueueStatus = "queued" | "uploading" | "success" | "error";

export interface UploadQueueItem<TPayload = unknown, TMeta = unknown, TResult = unknown> {
  id: string;
  fileName: string;
  size?: number;
  status: UploadQueueStatus;
  progress: number;
  error?: string;
  payload: TPayload;
  meta?: TMeta;
  attempts: number;
  createdAt: number;
  result?: TResult;
}

export interface UploadDescriptor<TPayload, TMeta = unknown> {
  fileName: string;
  size?: number;
  payload: TPayload;
  meta?: TMeta;
}

interface UseUploadQueueOptions<TPayload, TMeta, TResult> {
  uploadFn: (params: {
    item: UploadQueueItem<TPayload, TMeta, TResult>;
    signal: AbortSignal;
    updateProgress: (progress: number) => void;
  }) => Promise<TResult>;
  onSuccess?: (item: UploadQueueItem<TPayload, TMeta, TResult>, result: TResult | undefined) => void;
  onError?: (
    item: UploadQueueItem<TPayload, TMeta, TResult>,
    friendly: FriendlyErrorMessage,
  ) => void;
  context?: string;
}

type State<TPayload, TMeta, TResult> = UploadQueueItem<TPayload, TMeta, TResult>[];

type Action<TPayload, TMeta, TResult> =
  | { type: "enqueue"; items: UploadQueueItem<TPayload, TMeta, TResult>[] }
  | { type: "start"; id: string }
  | { type: "progress"; id: string; progress: number }
  | { type: "success"; id: string; result: TResult | undefined }
  | { type: "error"; id: string; error: string }
  | { type: "reset"; id: string }
  | { type: "remove"; id: string };

function queueReducer<TPayload, TMeta, TResult>(
  state: State<TPayload, TMeta, TResult>,
  action: Action<TPayload, TMeta, TResult>,
): State<TPayload, TMeta, TResult> {
  switch (action.type) {
    case "enqueue":
      return [...state, ...action.items];
    case "start":
      return state.map((item) =>
        item.id === action.id
          ? { ...item, status: "uploading", progress: Math.max(item.progress, 5), error: undefined, attempts: item.attempts + 1 }
          : item,
      );
    case "progress":
      return state.map((item) =>
        item.id === action.id
          ? { ...item, progress: Math.min(100, Math.max(0, action.progress)) }
          : item,
      );
    case "success":
      return state.map((item) =>
        item.id === action.id
          ? { ...item, status: "success", progress: 100, error: undefined, result: action.result }
          : item,
      );
    case "error":
      return state.map((item) =>
        item.id === action.id
          ? { ...item, status: "error", error: action.error, progress: Math.min(item.progress, 95) }
          : item,
      );
    case "reset":
      return state.map((item) =>
        item.id === action.id
          ? { ...item, status: "queued", progress: 0, error: undefined }
          : item,
      );
    case "remove":
      return state.filter((item) => item.id !== action.id);
    default:
      return state;
  }
}

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
};

const createAbortError = () => {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Upload cancelled", "AbortError");
  }

  const error = new Error("Upload cancelled");
  error.name = "AbortError";
  return error;
};

export function useUploadQueue<TPayload, TMeta = unknown, TResult = unknown>(
  options: UseUploadQueueOptions<TPayload, TMeta, TResult>,
) {
  const { uploadFn, onSuccess, onError, context } = options;
  const [items, dispatch] = useReducer(queueReducer<TPayload, TMeta, TResult>, []);
  const controllersRef = useRef(new Map<string, AbortController>());
  const processingRef = useRef(false);
  const itemsRef = useRef(items);
  const uploadFnRef = useRef(options.uploadFn);
  const successRef = useRef(onSuccess);
  const errorRef = useRef(onError);
  const contextRef = useRef(context);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    uploadFnRef.current = uploadFn;
  }, [uploadFn]);

  useEffect(() => {
    successRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    errorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const runNextUpload = useCallback(() => {
    if (processingRef.current) return;

    const next = itemsRef.current.find((item) => item.status === "queued");
    if (!next) return;

    processingRef.current = true;
    const controller = new AbortController();
    controllersRef.current.set(next.id, controller);
    dispatch({ type: "start", id: next.id });

    const execute = async () => {
      const getSnapshot = () => itemsRef.current.find((item) => item.id === next.id) ?? next;

      try {
        const currentBeforeStart = getSnapshot();
        const targetForUpload = currentBeforeStart ?? next;
        const result = await uploadFnRef.current({
          item: targetForUpload,
          signal: controller.signal,
          updateProgress: (progress) => dispatch({ type: "progress", id: next.id, progress }),
        });

        if (controller.signal.aborted) {
          throw createAbortError();
        }

        dispatch({ type: "success", id: next.id, result });
        const baseForSuccess = getSnapshot() ?? {
          ...next,
          status: "uploading" as const,
          progress: targetForUpload.progress,
        };
        const finalItem = {
          ...baseForSuccess,
          status: "success" as const,
          progress: 100,
          error: undefined,
          result,
        };
        successRef.current?.(finalItem, result);
      } catch (error) {
        const friendly = mapErrorToFriendlyMessage(error, contextRef.current);
        dispatch({ type: "error", id: next.id, error: friendly.description });
        const erroredItem =
          itemsRef.current.find((item) => item.id === next.id) ??
          ({
            ...next,
            status: "error" as const,
            progress: 0,
            error: friendly.description,
          } satisfies UploadQueueItem<TPayload, TMeta, TResult>);
        errorRef.current?.({
          ...erroredItem,
          error: friendly.description,
          status: "error",
          progress: Math.min(erroredItem.progress, 95),
        }, friendly);
      } finally {
        controllersRef.current.delete(next.id);
        processingRef.current = false;
        runNextUpload();
      }
    };

    void execute();
  }, []);

  useEffect(() => {
    runNextUpload();
  }, [items, runNextUpload]);

  const enqueue = useCallback(
    (descriptorOrDescriptors: UploadDescriptor<TPayload, TMeta> | UploadDescriptor<TPayload, TMeta>[]) => {
      const descriptors = Array.isArray(descriptorOrDescriptors)
        ? descriptorOrDescriptors
        : [descriptorOrDescriptors];

      const newItems = descriptors.map<UploadQueueItem<TPayload, TMeta, TResult>>((descriptor) => ({
        id: createId(),
        fileName: descriptor.fileName,
        size: descriptor.size,
        payload: descriptor.payload,
        meta: descriptor.meta,
        status: "queued",
        progress: 0,
        attempts: 0,
        createdAt: Date.now(),
      }));

      dispatch({ type: "enqueue", items: newItems });
      return newItems.map((item) => item.id);
    },
    [],
  );

  const cancel = useCallback((id: string) => {
    const controller = controllersRef.current.get(id);
    if (controller) {
      controller.abort();
    }
    dispatch({ type: "error", id, error: "Upload cancelled" });
  }, []);

  const retry = useCallback((id: string) => {
    const current = itemsRef.current.find((item) => item.id === id);
    if (!current || current.status === "uploading") {
      return;
    }

    dispatch({ type: "reset", id });
  }, []);

  const remove = useCallback((id: string) => {
    dispatch({ type: "remove", id });
  }, []);

  return {
    items,
    enqueue,
    cancel,
    retry,
    remove,
  } as const;
}
