// Standalone CommonJS checks; use the installed frontend ESLint binary.
module.exports = [{
  files: ["src/**/*.js", "tests/**/*.js", "eslint.config.cjs"],
  languageOptions: {
    ecmaVersion: "latest", sourceType: "commonjs",
    globals: Object.fromEntries(["Buffer", "process", "console", "URL", "setTimeout", "clearTimeout", "structuredClone", "__dirname", "__filename"].map((key) => [key, "readonly"])),
  },
  rules: {
    "no-undef": "error", "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
    "no-unreachable": "error", "no-dupe-keys": "error", "no-constant-condition": "error",
  },
}];
