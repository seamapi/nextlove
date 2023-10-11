import { z } from "zod"

const MetaDataSchema = z.object({
  legacySdkTakesDeviceIdStringParameter: z.boolean().optional(),
})

export type MetaData = z.infer<typeof MetaDataSchema>

export const withMetadata = (metaData: MetaData) => (next) => (req, res) => {
  return next(req, res)
}

export default withMetadata
