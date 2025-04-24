import type { ExtendableAutoFormProps } from "@autoform/react";
import type { ZodObjectOrWrapped } from "@autoform/zod";
import type { z } from "zod";

type Override<T1, T2> = Omit<T1, keyof T2> & T2;

export interface AutoFormProps<F extends ZodObjectOrWrapped>
	extends Override<ExtendableAutoFormProps<z.infer<F>>, { schema: F }> {}
