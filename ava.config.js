export default {
  files: ["tests/**/*.test.ts"],
  // This package is ESM only, so tests must load as ESM to resolve
  // its ESM only dependencies.
  extensions: { ts: "module" },
  nodeArguments: ["--import=tsx"],
  workerThreads: false,
  watchMode: {
    ignoreChanges: [".next"],
  },
}
