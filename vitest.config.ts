import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: path.resolve(__dirname, "app/src/test/setup.ts"),
    css: true,
    alias: {
      "@": path.resolve(__dirname, "app/src"),
    },
    exclude: [...configDefaults.exclude, "backend/**"],
  },
});
