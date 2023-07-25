import { z } from "zod";

export const todo = z
.object({
  id: z.string().uuid(),
})

export const ok = z.boolean()