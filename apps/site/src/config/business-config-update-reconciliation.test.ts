import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const businessConfigPath = resolve(
  process.cwd(),
  'src/config/business-config.tsx',
);

function getContent() {
  return readFileSync(businessConfigPath, 'utf8');
}

describe('business-config update reconciliation contracts', () => {
  it('keeps stockImport.onUpdate reconciling stock and core invoice fields', () => {
    const content = getContent();

    expect(content).toContain("schema: 'stockImport'");
    expect(content).toContain(
      'stockQuantity: Number(product.stockQuantity || 0) + delta',
    );
    expect(content).toContain(
      'partyId: currentStockImport?.party ?? variables.party',
    );
    expect(content).toContain(
      'issuedAt: currentStockImport?.importDate ?? variables.importDate',
    );
    expect(content).toContain('items: buildInvoiceItems(');
    expect(content).toContain('subTotal: totalAmount');
  });

  it('keeps sale.onUpdate reconciling stock and core invoice fields', () => {
    const content = getContent();

    expect(content).toContain("schema: 'sale'");
    expect(content).toContain(
      'stockQuantity: Number(product.stockQuantity || 0) - delta',
    );
    expect(content).toContain(
      'partyId: currentSale?.customerId ?? variables.customerId',
    );
    expect(content).toContain(
      'issuedAt: currentSale?.saleDate ?? variables.saleDate',
    );
    expect(content).toContain('items: buildInvoiceItems(');
    expect(content).toContain('subTotal: totalAmount');
  });

  it('keeps trip.onUpdate fallback reconciliation when updateContext newData is unavailable', () => {
    const content = getContent();

    expect(content).toContain("schema: 'trip'");
    expect(content).toContain('const previousTrip =');
    expect(content).toContain('...previousTrip,');
    expect(content).toContain('...variables,');
    expect(content).toContain(
      'variables.returnedProducts ?? previousTrip?.returnedProducts',
    );
    expect(content).toContain(
      'returnTime: variables.returnTime ?? previousTrip?.returnTime',
    );
  });
});
