// Lightweight Next profile with quality gates
import config from "./eslint-rules/next-base.mjs";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...config,
  {
    // Utility/temporary scripts exempt from quality gates.
    // Covers throwaway/debug/test scripts and the WhatsApp service, which
    // use CommonJS `require()`; converting them to ESM is a separate decision.
    files: [
      "local_scraper.ts",
      "evolution.ts",
      "fix_*.ts",
      "fix_*.js",
      "patch_*.js",
      "examples/**/*.js",
      "prisma/**/*.js",
      "public/**/*.js",  // PWA service workers, generated
      "scripts/**/*.js",
      "scripts/**/*.ts",
      "whatsapp/**/*.js",
      "test_*.js",
      "test_*.mjs",
    ],
    rules: {
      "quality/max-lines": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    // next.config.ts needs any for Vercel plugin config
    files: ["next.config.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
]);
