import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Two projects rather than one jsdom environment for everything: the pure
 * logic tests stub `window`/`navigator` themselves and are faster and more
 * honest without a DOM underneath them.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["app/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["app/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
