import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const businessConfigPath = resolve(
  process.cwd(),
  'src/config/business-config.tsx',
);
const retailSchemaPath = resolve(process.cwd(), 'src/lib/schemas/retail.tsx');

function getContent() {
  return readFileSync(businessConfigPath, 'utf8');
}

function getRetailSchemaContent() {
  return readFileSync(retailSchemaPath, 'utf8');
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
    const productSourceBlocks = [
      ...content.matchAll(/source:\s*\{[\s\S]*?table:\s*'product'[\s\S]*?\}/g),
    ];

    expect(productSourceBlocks.length).toBeGreaterThan(0);

    for (const block of productSourceBlocks) {
      expect(block[0]).toContain("key: 'product'");
    }
  });

  it('keeps payment status as a derived schema field for invoice and order flows', () => {
    const content = getRetailSchemaContent();
    const matches = content.match(/withDerivation\('paymentStatus'/g) ?? [];

    // invoice + order
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps paymentStatus hard-derived while paidAmount is soft-derived for invoice and order flows', () => {
    const content = getRetailSchemaContent();

    const paymentStatusDerivations =
      content.match(/withDerivation\('paymentStatus'/g) ?? [];
    const paidAmountDerivations =
      content.match(/withDerivation\('paidAmount'/g) ?? [];

    expect(paymentStatusDerivations.length).toBeGreaterThanOrEqual(2);
    expect(paidAmountDerivations.length).toBeGreaterThanOrEqual(2);

    expect(content).not.toContain(
      'function refreshPaidAmount(form: UseFormReturn)',
    );
    expect(content).not.toContain(
      'function refreshPaymentStatus(form: UseFormReturn)',
    );
  });

  it('keeps item totals derived while outflow unit price supports product-select autofill', () => {
    const content = getContent();
    const retailContent = getRetailSchemaContent();
    const totalAmountDerivations =
      retailContent.match(/withDerivation\('totalAmount'/g) ?? [];

    expect(content).not.toContain('function syncItemDerivedFields');
    expect(content).not.toContain('function setItemUnitPrice');
    expect(totalAmountDerivations.length).toBeGreaterThanOrEqual(3);
    expect(content).toContain('createSoftDerivedSellingUnitPriceField');
    expect(content).toContain('form.setValue(unitPricePath');
  });
});
