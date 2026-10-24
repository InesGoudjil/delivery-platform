import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "core/services/**",
        "core/security/**",
        "lib/validations/**",
        "lib/timecode.ts",
        "app/actions/**",
      ],
      exclude: [
        "**/*.d.ts",
        "**/index.ts",
        "tests/**",
      ],
    },
  },
});
