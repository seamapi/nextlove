module.exports = {
  files: ["tests/**/*.test.ts"],
  extensions: ["ts"],
  require: ["tsx/cjs"],
  watchMode: {
    ignoreChanges: [".next"],
  },
}
