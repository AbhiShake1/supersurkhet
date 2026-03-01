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
  it('keeps stockImport.onUpdate reconciling invoice fields with stockBook rows', () => {
    const content = getContent();

    expect(content).toContain("schema: 'stockImport'");
    expect(content).not.toContain(
      'stockQuantity: Number(product.stockQuantity',
    );
    expect(content).toContain("sourceTable: 'stockImport'");
    expect(content).toContain("movementType: 'purchase'");
    expect(content).toContain(
      'partyId: currentStockImport?.party ?? variables.party',
    );
    expect(content).toContain(
      'issuedAt: currentStockImport?.importDate ?? variables.importDate',
    );
    expect(content).toContain('items: buildInvoiceItems(');
    expect(content).toContain('subTotal: totalAmount');
  });

  it('keeps sale.onUpdate reconciling invoice fields with stockBook rows', () => {
    const content = getContent();

    expect(content).toContain("schema: 'sale'");
    expect(content).not.toContain(
      'stockQuantity: Number(product.stockQuantity',
    );
    expect(content).toContain("sourceTable: 'sale'");
    expect(content).toContain("movementType: 'sale'");
    expect(content).toContain('requireOriginPartyId: true');
    expect(content).toContain(
      'partyId: currentSale?.customerId ?? variables.customerId',
    );
    expect(content).toContain(
      'issuedAt: currentSale?.saleDate ?? variables.saleDate',
    );
    expect(content).toContain('items: buildInvoiceItems(');
    expect(content).toContain('subTotal: totalAmount');
  });

  it('keeps outflow unit price derived from selected product selling price', () => {
    const content = getContent();

    expect(content).toContain(
      'function createSoftDerivedSellingUnitPriceField()',
    );
    expect(content).toContain("table: 'product'");
    expect(content).toContain(
      'unitPrice: createSoftDerivedSellingUnitPriceField()',
    );
  });

  it('does not run outflow allocation assert for stock imports', () => {
    const content = getContent();
    const stockImportStart = content.indexOf("schema: 'stockImport'");
    const saleStart = content.indexOf("schema: 'sale'", stockImportStart);
    const stockImportSection = content.slice(
      stockImportStart,
      saleStart > stockImportStart ? saleStart : undefined,
    );

    expect(content).toContain("schema: 'stockImport'");
    expect(stockImportSection).not.toContain(
      "aggregate: stockAggregateExcludingSource('sale', createdId)",
    );
    expect(stockImportSection).not.toContain("contextLabel: 'sale'");
  });

  it('reconciles trip returns via shared helper across update paths', () => {
    const content = getContent();

    expect(content).toContain(
      'async function reconcileTripReturnStockAndSale({',
    );
    expect(content).toContain('await reconcileTripReturnStockAndSale({');
    expect(content).not.toContain('void db.trip.update(slug)({');
  });
});
