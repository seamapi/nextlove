// nsm generates .nsm/ from the Next.js app but does not carry over rewrites,
// so they are resolved here and written alongside it as a module nsm can import.
import { writeFile } from "node:fs/promises"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const nextConfig = require("../next.config.js")

const rewrites =
  typeof nextConfig.rewrites === "function"
    ? await nextConfig.rewrites()
    : (nextConfig.rewrites ?? {})

await writeFile(
  new URL("../.nsm/next.config.ts", import.meta.url),
  `export default ${JSON.stringify({ rewrites }, null, 2)}\n`
)
