import { createServerFn } from '@tanstack/react-start';

export const dummyFn = createServerFn({ method: 'POST' }).handler(async () => {
  return "hello";
});
