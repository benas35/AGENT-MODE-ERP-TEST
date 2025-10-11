import { z } from "@/lib/validation";

export const mediaCaptionSchema = z.object({
  caption: z.string().trim().max(140, "Captions must be 140 characters or fewer"),
});

export type MediaCaptionFormValues = z.infer<typeof mediaCaptionSchema>;
