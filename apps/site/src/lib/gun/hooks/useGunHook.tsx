import type { IGunInstance } from 'gun/types';
import { mergeOptionsWithDefaults } from '../options';

export type UseGunOptions = Readonly<{
  schema: GTAAppConfig['schema'];
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  gun: IGunInstance<any>;
}>;

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
type AnyFunction = (...args: any[]) => any;

type GunHookMessenger = {
  _options: UseGunOptions;
};

type WithoutMessenger<F extends AnyFunction> = F extends (
  messenger: GunHookMessenger,
  ...args: infer P
) => infer R
  ? (...args: P) => R
  : F;
// biome-ignore lint/complexity/noBannedTypes: lint debt cleanup
type MessengerFunction<F extends Function> = (messenger: GunHookMessenger) => F;

const useDefaultOptionsMsg =
  'Please use `setGTADefaultOptions` in your project root outside any component lifecycle.';

// biome-ignore lint/complexity/noBannedTypes: lint debt cleanup
export function createGunHook<F extends Function>(fn: MessengerFunction<F>) {
  const defaultOptions = mergeOptionsWithDefaults({});
  if (!defaultOptions.gun)
    throw new Error(`Gun instance not found. ${useDefaultOptionsMsg}`);
  if (!defaultOptions.schema)
    throw new Error(`Default schema not set. ${useDefaultOptionsMsg}`);

  return Object.assign(fn({ _options: defaultOptions as UseGunOptions }), {
    withOptions: (options: Partial<UseGunOptions>) =>
      fn({
        _options: mergeOptionsWithDefaults(options) as Required<typeof options>,
      }),
  });
}
