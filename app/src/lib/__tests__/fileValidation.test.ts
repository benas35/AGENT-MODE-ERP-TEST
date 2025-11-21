import { describe, expect, it } from "vitest";
import { validateFiles } from "@/lib/fileValidation";

const makeFile = (name: string, sizeMb: number, type: string) =>
  new File([new Uint8Array(sizeMb * 1024 * 1024)], name, { type });

describe("file validation", () => {
  it("rejects oversized files", () => {
    const { valid, rejected } = validateFiles([makeFile("too-big.jpg", 25, "image/jpeg")], {
      maxFileSizeMb: 10,
      allowedMimePrefixes: ["image/"],
    });

    expect(valid).toHaveLength(0);
    expect(rejected[0]).toContain("too-big.jpg");
  });

  it("accepts valid images", () => {
    const { valid, rejected } = validateFiles([makeFile("ok.jpg", 1, "image/jpeg")], {
      maxFileSizeMb: 5,
      allowedMimePrefixes: ["image/"],
    });

    expect(valid).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });
});
