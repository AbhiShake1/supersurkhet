import { pixelArt } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import type { IGunUserInstance } from "gun/types";
import { z } from "zod";
import { gun } from "./gun";
import { setUser } from "@/server-functions/user";
import { getGunRef, mergeKeys } from "@/lib/gun/utils";

export const googleLoginSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().url().optional(),
});

export type GoogleLoginSchema = z.infer<typeof googleLoginSchema>;

export async function googleLogin({ email, name, avatar }: GoogleLoginSchema) {
  if (!import.meta.env.VITE_GOOGLE_LOGIN_BACKDOOR) return;

  // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
  return new Promise<IGunUserInstance["is"]>(async (resolve, reject) => {
    const alias = email.toLowerCase();
    const userExists = await new Promise((resolve) => {
      gun.get(`~@${alias}`).once((data) => resolve(!!data));
    });

    if (userExists) {
      gun
        .user()
        .auth(alias, import.meta.env.VITE_GOOGLE_LOGIN_BACKDOOR, (ack) => {
          if ("err" in ack && ack.err) return reject(new Error(ack.err));
          if ("sea" in ack) {
            setUser({ data: ack.sea })
          }
          resolve(gun.user().is);
        });
    } else {
      gun
        .user()
        .create(alias, import.meta.env.VITE_GOOGLE_LOGIN_BACKDOOR, (ack) => {
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
          getGunRef(mergeKeys("user")).get(ack.pub).put(userProfile);
          gun
            .user()
            .auth(alias, import.meta.env.VITE_GOOGLE_LOGIN_BACKDOOR, (ack) => {
              if ("err" in ack && ack.err) return reject(new Error(ack.err));
              if ("sea" in ack) {
                setUser({ data: ack.sea })
              }
              resolve(gun.user().is);
            });
        });
    }
  });
}
