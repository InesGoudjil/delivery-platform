// ESLint 9 flat config. Replaces `next lint`, which Next.js 16 removed.
// Run with `npm run lint` (`eslint .`).
//
// Severity policy: CI fails on errors only.
//   error: likely runtime bugs or breakage. Every preset rule left at `error`
//          has zero hits today, so it stops new occurrences from landing.
//   warn:  tech debt, style, and React Compiler advice. Visible, never blocking.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  globalIgnores([
    // Build output and generated files (the first four are also eslint-config-next defaults).
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**", // vitest coverage HTML report, ships its own JS
    "node_modules/**", // ignored by ESLint anyway; listed for clarity
    // Not application source.
    "public/**", // static files served as-is, incl. the service worker public/sw.js
    "supabase/**", // Supabase CLI project: SQL migrations, config.toml, .temp/
    ".agents/**", // vendored agent skill bundles (gitignored)
    ".zcode/**", // agent planning notes
  ]),

  ...nextVitals,
  ...nextTs,

  {
    name: "cut/severity-overrides",
    rules: {
      // --- TypeScript debt (tsconfig has `strict: false`) ---
      // Hundreds of hits. Typing them is incremental cleanup, not a CI blocker.
      "@typescript-eslint/no-explicit-any": "warn",
      // Already `warn` in next/typescript. A leading `_` marks a binding as intentionally unused,
      // and `const { omitted, ...rest } = obj` is an idiom, not dead code.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // `interface Props extends Base {}` is a deliberate named alias. Still an error for `{}`
      // used as a type, which actually means "any non-nullish value".
      "@typescript-eslint/no-empty-object-type": ["error", { allowInterfaces: "with-single-extends" }],
      // Style: a `let` that is never reassigned. Not a bug.
      "prefer-const": "warn",

      // --- React ---
      // `'` and `"` in JSX text render fine. A stray `>` or `}` is already a parse error in TSX.
      "react/no-unescaped-entities": "warn",
      // Already `warn` in the preset. Pinned so a preset upgrade can't start failing CI.
      "react-hooks/exhaustive-deps": "warn",

      // --- React Compiler diagnostics (eslint-plugin-react-hooks v7) ---
      // These are errors upstream, but this app doesn't enable the React Compiler. They flag
      // performance and idiom issues (setState in effects, Date.now()/ref reads during render,
      // components defined inside components), not breakage.
      // rules-of-hooks, set-state-in-render (render loop), globals and use-memo stay at `error`.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",

      // --- Next.js ---
      // Already `warn` in the preset; pinned here. Many <img> are deliberate: user media,
      // the Meta Pixel <noscript> beacon.
      "@next/next/no-img-element": "warn",
    },
  },

  {
    name: "cut/tests",
    files: ["tests/**"],
    rules: {
      // Partial mocks and fakes are routinely typed as `any`.
      "@typescript-eslint/no-explicit-any": "off",
      // Tests render with React.createElement in .ts files. When `children` is a required prop,
      // the TS types make you pass it in the props object.
      "react/no-children-prop": "off",
    },
  },
]);
