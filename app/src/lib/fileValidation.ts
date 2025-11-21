import { sanitizeText } from "@/lib/validation";

export interface FileValidationOptions {
  maxFileSizeMb?: number;
  allowedMimePrefixes?: string[];
  allowedExtensions?: string[];
}

export interface FileValidationResult {
  valid: File[];
  rejected: string[];
}

const DEFAULT_MAX_MB = 20;

export const validateFiles = (
  incoming: FileList | File[],
  options: FileValidationOptions = {},
): FileValidationResult => {
  const maxFileSizeMb = options.maxFileSizeMb ?? DEFAULT_MAX_MB;
  const allowedMimePrefixes = options.allowedMimePrefixes ?? ["image/", "application/pdf"];
  const allowedExtensions = options.allowedExtensions?.map((ext) => ext.toLowerCase());

  const valid: File[] = [];
  const rejected: string[] = [];

  Array.from(incoming).forEach((file) => {
    const mimeAllowed = allowedMimePrefixes.some((prefix) => file.type.startsWith(prefix));
    const extensionAllowed = allowedExtensions
      ? allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
      : true;
    const sizeAllowed = file.size <= maxFileSizeMb * 1024 * 1024;

    if (mimeAllowed && extensionAllowed && sizeAllowed) {
      valid.push(file);
    } else {
      rejected.push(
        `${sanitizeText(file.name)} (${(file.size / 1024 / 1024).toFixed(1)}MB) is not allowed`,
      );
    }
  });

  return { valid, rejected };
};
