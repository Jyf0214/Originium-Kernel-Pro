import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  {
    ignores: ["**/.next/**", "**/node_modules/**", "**/dist/**", "**/build/**", "scripts/**"],
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "eqeqeq": ["error", "always"]
    }
  }
]);
