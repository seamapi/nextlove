module.exports = {
  files: ["tests/**/*.test.ts"],
  extensions: ["ts"],
  require: ["esbuild-runner/register"],
  ignoredByWatcher: [".next"],
};
