import { runDeriveWithRuntimeFormValues } from '@/lib/zod/with-derivations';
import type {
  DeriveConfig,
  DerivedFieldResult,
  DeriveFn,
  FieldConfigCustomData,
} from '../ui/autoform';

export function getDeriveFn(
  customData: FieldConfigCustomData | undefined,
): DeriveFn | undefined {
  const derive = customData?.derive;
  if (!derive) return undefined;
  if (typeof derive === 'function') return derive;
  return (derive as DeriveConfig).run;
}

export function applyDerivedValuesToRow(
  row: Record<string, unknown>,
  deriveFns: Map<string, DeriveFn>,
) {
  let nextRow = row;
  for (const [key, deriveFn] of deriveFns.entries()) {
    const result = runDeriveWithRuntimeFormValues(nextRow, () =>
      deriveFn({
        formValues: nextRow,
        rowPath: [],
        fieldPath: [key],
        sourceRow: null as never,
      }),
    );
    if (result instanceof Promise) {
      continue;
    }
    if (!result) {
      continue;
    }
    const deriveResult = result satisfies DerivedFieldResult;
    const derivedValue =
      'value' in deriveResult
        ? deriveResult.value
        : deriveResult.inputProps?.value;
    if (typeof derivedValue === 'undefined') {
      continue;
    }
    if (Object.is(nextRow[key], derivedValue)) {
      continue;
    }
    nextRow = {
      ...nextRow,
      [key]: derivedValue,
    };
  }

  return nextRow;
}
