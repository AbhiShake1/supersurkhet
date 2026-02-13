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

  it('keeps paymentStatus hard-derived while paidAmount is soft-derived for all payment flows', () => {
    const content = getContent();

    const paymentStatusDerivations =
      content.match(/withDerivation\('paymentStatus'/g) ?? [];
    const paidAmountDerivations =
      content.match(/withDerivation\('paidAmount'/g) ?? [];

    // stockImport + sale + order
    expect(paymentStatusDerivations).toHaveLength(3);
    expect(paidAmountDerivations).toHaveLength(3);

    expect(content).not.toContain('function refreshPaidAmount(form: UseFormReturn)');
    expect(content).not.toContain('function refreshPaymentStatus(form: UseFormReturn)');
  });

  it('keeps item totals and pricing/unit defaults fully derived with no imperative setValue writes', () => {
    const content = getContent();
    const totalAmountDerivations =
      content.match(/totalAmount:\s*createDerivedItemTotalAmountField\(/g) ?? [];
    const setValueCalls = content.match(/form\.setValue\(/g) ?? [];

    expect(content).not.toContain('function syncItemDerivedFields');
    expect(content).not.toContain('function setItemUnitPrice');
    expect(totalAmountDerivations).toHaveLength(3);
    expect(setValueCalls).toHaveLength(0);
  });
});
