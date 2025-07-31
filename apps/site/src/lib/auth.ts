import { pixelArt } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { z } from "zod";
import { gun } from "./gun";

export const googleLoginSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().url().optional(),
})

export type GoogleLoginSchema = z.infer<typeof googleLoginSchema>;

export async function googleLogin({ email, name, avatar }: GoogleLoginSchema) {
  if (process.env.GOOGLE_LOGIN_BACKDOOR) {
    gun.user().auth(process.env.GOOGLE_LOGIN_BACKDOOR, (ack) => {
      if ("err" in ack) {
        console.error("backdoor auth failed", ack.err);
      }
    });
  }
  const alias = email.toLowerCase();
  const userExists = await new Promise((resolve) => {
    gun.get("~@" + alias).once((data) => resolve(!!data));
  });

  if (userExists) {
    return new Promise((resolve, reject) => {
      gun.user().auth(alias, email, (ack) => {
        if ("err" in ack && ack.err) return reject(new Error(ack.err));
        resolve(gun.user().is);
      });
    });
  } else {
    return new Promise((resolve, reject) => {
      gun.user().create(alias, email, (ack) => {
        if ("err" in ack) return reject(new Error(ack.err));

        const userProfile = {
          email: alias,
          name,
          role: "user",
          isActive: true,
          avatar: avatar || createAvatar(pixelArt).toDataUri(),
          phone: "",
          permissions: {},
        };
        gun.get("user").get(ack.pub).put(userProfile);
        gun.user().auth(alias, email, (ack) => {
          if ("err" in ack && ack.err) return reject(new Error(ack.err));
          resolve(gun.user().is);
        });
      });
    });
  }
}
