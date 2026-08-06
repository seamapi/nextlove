export default {
  files: ["tests/**/*.test.ts"],
  extensions: ["ts"],
  nodeArguments: ["--import=tsx"],
  workerThreads: false,
  watchMode: {
    ignoreChanges: [".next"],
  },
}
