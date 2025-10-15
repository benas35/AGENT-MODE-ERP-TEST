import { z, type ZodTypeAny } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SubmitHandler } from "react-hook-form";

export { z, zodResolver };

export const stringNonEmpty = (message = "This field is required") =>
  z.string().trim().min(1, message);

export const schemaResolver = <TSchema extends ZodTypeAny>(schema: TSchema) => zodResolver(schema);

type SafeSubmitOptions<TValues> = {
  onError?: (error: unknown, values: TValues) => void;
};

export const safeSubmit = <TValues>(
  handler: SubmitHandler<TValues>,
  options: SafeSubmitOptions<TValues> = {},
): SubmitHandler<TValues> => {
  const { onError } = options;

  return async (values, event) => {
    try {
      await handler(values, event);
    } catch (error) {
      console.error("Form submission failed", error);
      onError?.(error, values);
    }
  };
};

export type { ZodTypeAny };
