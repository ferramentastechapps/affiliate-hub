// Lightweight Next profile with quality gates
import config from "./eslint-rules/next-base.mjs";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...config,
  {
    // Utility/temporary scripts exempt from quality gates
    files: [
      "local_scraper.ts",
      "evolution.ts",
      "fix_*.ts",
      "fix_*.js",
      "examples/**/*.js",
    ],
    rules: {
      "quality/max-lines": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
]);
