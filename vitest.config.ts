import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@core": resolve(import.meta.dirname, "./core"),
      "@features": resolve(import.meta.dirname, "./features"),
      "@widgets": resolve(import.meta.dirname, "./widgets"),
      "@entities": resolve(import.meta.dirname, "./entities"),
      "@shared": resolve(import.meta.dirname, "./shared"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", ".claude/worktrees/**"],
    coverage: {
      provider: "v8",
      include: [
        "app/**",
        "core/**",
        "features/**",
        "widgets/**",
        "entities/**",
        "shared/**",
      ],
      exclude: ["**/*.test.*", "**/*.d.ts"],
    },
  },
});
