/* eslint-env node */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: { browser: true, node: true, es2024: true },
  ignorePatterns: ["dist", "node_modules", "slots", "src/web/src/components/ui/**"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "@typescript-eslint/no-explicit-any": "error",
    "no-restricted-syntax": [
      "error",
      {
        selector: "TSAsExpression[typeAnnotation.typeName.name!='const']",
        message: "No type casting with `as` — use type guards, satisfies, or zod parse.",
      },
      {
        selector: "TSTypeAssertion",
        message: "No angle-bracket type casting — use type guards, satisfies, or zod parse.",
      },
    ],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
  overrides: [
    {
      files: ["*.cjs", "*.config.ts"],
      rules: { "@typescript-eslint/no-var-requires": "off" },
    },
  ],
};
