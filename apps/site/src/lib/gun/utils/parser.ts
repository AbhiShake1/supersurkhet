import { z } from "zod"
import type { SchemaKeys } from "..";

export type ParseOptions = {
    key: SchemaKeys
    shape: z.ZodObject<any>
    obj: Record<any, any>
}

function _parse<P extends ParseOptions>(key: P["key"], obj: P["obj"], schema: P["shape"], parser: (shape: P["shape"], obj: P["obj"]) => any) {
    const keys = key.split(".")

    const [head, ...tail] = keys;

    const innerSchema = schema.shape[head as keyof P["shape"]]

    if (!head?.length || !innerSchema) return parser(schema, obj)

    return _parse(tail.join(".") as P["key"], obj, innerSchema, parser)
}

export function parseNestedZodShape<P extends ParseOptions>(key: P["key"], obj: P["obj"], baseSchema: P["shape"]) {
    return _parse(key, obj, baseSchema, (shape, o) => shape.parse(o))
}

export function parseNestedZodType<P extends ParseOptions>(key: P["key"], obj: P["obj"], baseSchema: P["shape"], {isPartial = false} = {}) {
    // schema.shape.business.shape.restaurant.shape.menu._def.innerType.parse([])
    // return _parse(key, obj, (shape, o) => shape._def.innerType.parse(o))
    return _parse(key, obj, baseSchema, (shape, o) => (isPartial ? shape.partial() : shape).parse(o))
}
