import GUN from "gun"
import "gun/sea"
// import { useEffect, useState } from "react"
import { z } from "zod"

const schema = z.object({
    school: z.object({
        name: z.string(),
        address: z.string(),
        city: z.string(),
        teachers: z.array(
            z.object({
                name: z.string(),
                phoneNumber: z.string(),
            })
        ),
    }),
    restaurant: z.object({
        name: z.string(),
        address: z.string(),
        city: z.string(),
        menu: z.array(
            z.object({
                name: z.string(),
                price: z.number(),
            })
        ),
    }),
})

type Schema = z.infer<typeof schema>

const secretKey = "#secret-super-secure"

export const gun = GUN()

// type UseGunGetOptions<T extends keyof Schema> = {
//     key: T;
//     initialValue?: Schema[T];
// };

// export function useGunGet<T extends keyof Schema>({ key, initialValue }: UseGunGetOptions<T>) {
//     const [data, setData] = useState<Schema[T] | undefined>(initialValue);
//     const [error, setError] = useState<Error | null>(null);
//     const [isLoading, setIsLoading] = useState(true);

//     useEffect(() => {
//         setIsLoading(true);
//         setError(null);

//         const keyRef = gun.get(key);

//         keyRef.on((receivedData, _key) => {
//             try {
//                 const validatedData = schema.shape[_key].parse(receivedData) as Schema[T];
//                 setData(validatedData);
//                 setError(null);
//             } catch (err) {
//                 setError(err instanceof Error ? err : new Error(String(err)));
//             } finally {
//                 setIsLoading(false);
//             }
//         });

//         return () => {
//             keyRef.off();
//         };
//     }, [key, schema]);

//     return { data, error, isLoading };
// }

// type UseGunSetOptions<T extends keyof Schema> = {
//     key: T;
//     data?: Schema[T];
// };

// export function useGunSet<T extends keyof Schema>({ key, data }: UseGunSetOptions<T>) {
//     const [isLoading, setIsLoading] = useState(false);
//     const [error, setError] = useState<Error | null>(null);

//     const set = async (value: typeof data) => {
//         try {
//             setIsLoading(true);
//             setError(null);

//             return new Promise<void>((resolve) => {
//                 gun.get(key).put(value, () => {
//                     setIsLoading(false);
//                     resolve();
//                 });
//             });
//         } catch (err) {
//             setError(err instanceof Error ? err : new Error(String(err)));
//             setIsLoading(false);
//             throw err;
//         }
//     };

//     return { set, isLoading, error };
// }