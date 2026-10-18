const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: { ...globals.node }
    },
    rules: {
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-unused-vars": ["error", { caughtErrors: "none" }]
    }
  }
];
