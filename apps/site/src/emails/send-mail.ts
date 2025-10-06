import { createServerFn } from "@tanstack/react-start";
import { SESClient, SendEmailCommand, type SendEmailCommandInput } from "@aws-sdk/client-ses";
import { z } from "zod";

export const sendMail = createServerFn({ method: "POST" })
    .validator(z.custom<SendEmailCommandInput>())
    .handler(async ({ data }) => {
        const ses = new SESClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
            },
        });
        ses.send(new SendEmailCommand(data))
    })