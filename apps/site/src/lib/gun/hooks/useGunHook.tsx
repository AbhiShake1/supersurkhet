import type { IGunInstance } from "gun/types";
import { mergeOptionsWithDefaults } from "../options";

export type UseGunOptions = Readonly<{
    schema: GTAAppSchema
    gun: IGunInstance<any>
}>

type AnyFunction = (...args: any[]) => any

export type GunHookMessenger = {
    _options: UseGunOptions;
}

type WithoutMessenger<F extends AnyFunction> = F extends (messenger: GunHookMessenger, ...args: infer P) => infer R
    ? (...args: P) => R
    : F

export type UseGunHook<F extends AnyFunction> = WithoutMessenger<F> & GunHookMessenger & {
    withOptions(options: Partial<UseGunOptions>): WithoutMessenger<F>;
}

type MessengerFunction<F extends Function> = (messenger: GunHookMessenger) => F

const useDefaultOptionsMsg = "Please use `setGTADefaultOptions` in your project root outside any component lifecycle."

export function createGunHook<F extends Function>(fn: MessengerFunction<F>) {
    const defaultOptions = mergeOptionsWithDefaults({});
    if (!defaultOptions.schema) throw new Error(`Default schema not set. ${useDefaultOptionsMsg}`)
    if (!defaultOptions.gun) throw new Error(`Gun instance not found. ${useDefaultOptionsMsg}`)
    
    return Object.assign(fn({_options: defaultOptions as UseGunOptions}), {
        withOptions: function (options: Partial<UseGunOptions>) {
            return fn({ _options: mergeOptionsWithDefaults(options) as Required<typeof options> });
        }
    })
}

// export function createGunHook<F extends Function, FuncImpl extends MessengerFunction<F> = MessengerFunction<F>>(fn: FuncImpl): F {
//     const defaultOptions = mergeOptionsWithDefaults({});
//     if (!defaultOptions.schema) throw new Error(`Default schema not set. ${useDefaultOptionsMsg}`)
//     if (!defaultOptions.gun) throw new Error(`Gun instance not found. ${useDefaultOptionsMsg}`)
    
//     return Object.assign(fn({ _options: defaultOptions as Required<typeof defaultOptions> }), {
//         withOptions: function (options: Partial<UseGunOptions>) {
//             return fn({ _options: mergeOptionsWithDefaults(options) as Required<typeof options> });
//         }
//     });
// }
