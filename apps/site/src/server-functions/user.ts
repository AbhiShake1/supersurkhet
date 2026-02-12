import { createServerFn } from '@tanstack/react-start';
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server';
import type { ISEAPair } from 'gun/types';
import { z } from 'zod';

// export const getUser = async () => {
//   return JSON.parse(localStorage.getItem("gun-user") || "{}");
// }
//
// export const removeUser = async () => {
//   localStorage.removeItem("gun-user");
// }
//
// export const setUser = async (user: any) => {
//   localStorage.setItem("gun-user", JSON.stringify(user));
// }

export const getUser = createServerFn().handler(() => {
  const user = getCookie('gun-user');
  return JSON.parse(user ?? '{}') as ISEAPair;
});

export const removeUser = createServerFn().handler(() => {
  return deleteCookie('gun-user');
});

export const setUser = createServerFn()
  .inputValidator(z.custom<ISEAPair>())
  .handler(({ data: user }) => {
    return setCookie('gun-user', JSON.stringify(user));
  });
