/** @type {import("eslint").Linter.Config} */
export default {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "eslint-config-prettier",
  ],
  rules: {
    "object-curly-spacing": "off",
    "max-len": "off",
    "require-jsdoc": "off",
    "operator-linebreak": "off",
    "quote-props": "off",
    quotes: ["warn", "double", { avoidEscape: true }],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-empty-function": "off",
  },
  ignorePatterns: ["lib/**", "node_modules/**"],
};
