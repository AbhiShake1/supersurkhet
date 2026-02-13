import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const businessConfigPath = resolve(
  process.cwd(),
  'src/config/business-config.tsx',
);

function getContent() {
  return readFileSync(businessConfigPath, 'utf8');
}

describe('business-config derived contracts', () => {
  it('keeps useBusinessConfig free of compiler memo directive to avoid stale HMR tab config', () => {
    const content = getContent();

    expect(content).not.toMatch(
      /export function useBusinessConfig[\s\S]*?'use memo';/,
    );
  });

  it('keeps product-backed unit derivation keyed by selected product', () => {
    const content = getContent();
    const productSourceBlocks = [...content.matchAll(/source:\s*\{[\s\S]*?table:\s*'product'[\s\S]*?\}/g)];

    expect(productSourceBlocks.length).toBeGreaterThan(0);

    for (const block of productSourceBlocks) {
      expect(block[0]).toContain("key: 'product'");
    }
  });

  it('keeps payment status as a derived schema field for all payment flows', () => {
    const content = getContent();
    const matches = content.match(/withDerivation\('paymentStatus'/g) ?? [];

    // stockImport + sale + order
    expect(matches).toHaveLength(3);
  });

  it('updates paid amount softly from item rows and recomputes payment status on manual edit', () => {
    const content = getContent();

    expect(content).toContain('function refreshPaidAmount(form: UseFormReturn)');
    expect(content).toContain("form.setValue('paidAmount', totalCost);");
    expect(content).toContain('function refreshPaymentStatus(form: UseFormReturn)');

    const manualPaidAmountHooks = content.match(/onValueChange:\s*\(_,\s*__,\s*form\)\s*=>\s*\{\s*refreshPaymentStatus\(form\);\s*\}/g) ?? [];

    // stockImport + sale + order
    expect(manualPaidAmountHooks).toHaveLength(3);
  });

  it('routes row field updates through syncItemDerivedFields', () => {
    const content = getContent();
    const syncCalls = content.match(/syncItemDerivedFields\(form, path\)/g) ?? [];

    // Should be used across product/unit/quantity/unitPrice handlers in all relevant sections.
    expect(syncCalls.length).toBeGreaterThanOrEqual(18);
  });
});
