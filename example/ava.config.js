export default {
  files: ["tests/**/*.test.ts"],
  // nextlove is ESM only, so tests must load as ESM to resolve its ESM only
  // dependencies.
  extensions: { ts: "module" },
  nodeArguments: ["--import=tsx"],
  // Node.js ignores the --import in a worker thread's execArgv, so the tsx
  // hooks are only registered when each test file gets its own process.
  workerThreads: false,
  watchMode: {
    ignoreChanges: [".next"],
  },
}
