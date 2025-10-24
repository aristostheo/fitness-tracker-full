/* functions/.eslintrc.cjs */
module.exports = {
  root: true,
  env: { es2021: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
  ],
  ignorePatterns: [
    "lib/**", // ignore compiled output
    "node_modules/**",
    "**/*.d.ts",
  ],
  rules: {
    // Keep it practical for CI/deploy:
    "max-len": "off",
    "require-jsdoc": "off",
    "object-curly-spacing": "off",
    "operator-linebreak": "off",
    quotes: "off",
    "quote-props": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/no-empty-function": "off",
    "import/no-unresolved": "off",
    "no-useless-escape": "off",
  },
};
