import { pixelArt } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import type { IGunUserInstance } from 'gun/types';
import { z } from 'zod';
import { gun } from './gun';
import { setUser } from '@/server-functions/user';
import { getGunRef, mergeKeys } from '@/lib/gun/utils';
import { createServerFn } from '@tanstack/react-start';

export const googleLoginSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().url().optional(),
});

export type GoogleLoginSchema = z.infer<typeof googleLoginSchema>;

const getBackdoor = createServerFn().handler(() => {
  return process.env.GOOGLE_LOGIN_BACKDOOR;
});

export async function googleLogin({ email, name, avatar }: GoogleLoginSchema) {
  const backdoor = await getBackdoor();
  if (!backdoor) throw new Error('Google login failed [NO BACKDOOR]');

  return new Promise<IGunUserInstance['is']>((resolve, reject) => {
    const alias = email.toLowerCase();
    gun.get(`~@${alias}`).once((data) => {
      const userExists = !!data;
      if (userExists) {
        gun.user().auth(alias, backdoor, (ack) => {
          if ('err' in ack && ack.err) return reject(new Error(ack.err));
          if ('sea' in ack) {
            setUser({ data: ack.sea });
          }
          resolve(gun.user().is);
        });
        return;
      }
      gun.user().create(alias, backdoor, (ack) => {
        if ('err' in ack) return reject(new Error(ack.err));

        const userProfile = {
          email: alias,
          name,
          role: 'user',
          isActive: true,
          avatar: avatar || createAvatar(pixelArt).toDataUri(),
          phone: '',
          permissions: {},
        };
        getGunRef(mergeKeys('user')).get(ack.pub).put(userProfile);
        gun.user().auth(alias, backdoor, (ack) => {
          if ('err' in ack && ack.err) return reject(new Error(ack.err));
          if ('sea' in ack) {
            setUser({ data: ack.sea });
          }
          resolve(gun.user().is);
        });
      });
    });
  });
}
