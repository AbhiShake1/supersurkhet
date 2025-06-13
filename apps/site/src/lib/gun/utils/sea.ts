import SEA from "gun/sea";

// const secret = "#supersekret";

// const isServer = typeof window === "undefined";

export async function encrypt<T extends Record<string, any>>(_obj: T) {
	return _obj;
	// if (isServer) return;
	// const obj = structuredClone(_obj)
	// for (const [key, value] of Object.entries(obj)) {
	//     if (typeof value === "object") {
	//         // @ts-expect-error
	//         obj[key] = await entrypt(value)
	//     } else {
	//         // @ts-expect-error
	//         obj[key] = await SEA.encrypt(value, secret)
	//     }
	// }
	// console.log('enc', obj)
	// return obj
}

export async function decrypt<T>(o: T): Promise<T | undefined> {
	return o;
	// if (isServer) return;
	// const obj = structuredClone(o)
	// for (const [key, value] of Object.entries(obj)) {
	//     if (typeof value === "object") {
	//         obj[key] = await decrypt(value)
	//     } else {
	//         obj[key] = await SEA.decrypt(value, secret)
	//     }
	// }
	// console.log('dec', obj)
	// return obj as T
}
