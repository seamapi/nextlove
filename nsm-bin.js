#!/usr/bin/env node
try {
  await import("nextjs-server-modules/bin.js")
} catch (err) {
  if (
    err?.code === "ERR_MODULE_NOT_FOUND" &&
    err.message.includes("'nextjs-server-modules'")
  ) {
    console.error(
      "The nsm command requires nextjs-server-modules, an optional peer dependency of nextlove.\n" +
        "Install it to use this command, e.g. npm install --save-dev nextjs-server-modules"
    )
    process.exit(1)
  }
  throw err
}
