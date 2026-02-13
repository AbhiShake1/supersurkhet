import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const businessConfigPath = resolve(
  process.cwd(),
  'src/config/business-config.tsx',
);

describe('business-config soft paid derivation', () => {
  it('keeps payment status derived from paidAmount and item totals', () => {
    const content = readFileSync(businessConfigPath, 'utf8');

    expect(content).toContain('function getPaidAmountFromFormValues(formValues:');
    expect(content).toContain('const totalCost = getTotalCostFromItems(formValues.items ?? []);');
    expect(content).toContain('const paidAmount = getPaidAmountFromFormValues(formValues);');
    expect(content).toContain("withDerivation('paidAmount'");
  });
});
