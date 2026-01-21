import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend, type CreateEmailOptions } from 'resend';

const emailMiddleware = createMiddleware().server(async ({ next }) => {
  const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY)
  return next({ context: { resend } })
})

export const sendMail = createServerFn({ method: "POST" })
  .middleware([emailMiddleware])
  .inputValidator(z.custom<CreateEmailOptions>())
  .handler(async ({ data, context: { resend } }) => {
    const { data: result, error } = await resend.emails.send(data)
    if (error) throw error

    return result
  })
