import { z } from 'zod'

export const signupInputSchema = z.object({
  waitlistSlug: z.string().min(1).max(100),
  email: z.email().max(320),
  ref: z.string().regex(/^[0-9A-Za-z_-]{8}$/).optional(),
})

export type SignupInput = z.infer<typeof signupInputSchema>
