import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const retailSchemaPath = resolve(process.cwd(), 'src/lib/schemas/retail.tsx');

describe('retail schema payment removal contracts', () => {
  it('removes payment and notes fields from sale and stock import schemas', () => {
    const content = readFileSync(retailSchemaPath, 'utf8');
    const saleStart = content.indexOf('export const saleSchema');
    const orderStart = content.indexOf('export const orderSchema', saleStart);
    const stockImportStart = content.indexOf('export const stockImportSchema');
    const stockBookStart = content.indexOf(
      'export const stockBookSchema',
      stockImportStart,
    );
    const saleSection = content.slice(saleStart, orderStart);
    const stockImportSection = content.slice(stockImportStart, stockBookStart);

    expect(saleSection).not.toContain('payments:');
    expect(saleSection).not.toContain('paidAmount:');
    expect(saleSection).not.toContain('paymentStatus:');
    expect(saleSection).not.toContain('paymentMethod:');
    expect(saleSection).not.toContain('notes:');

    expect(stockImportSection).not.toContain('payments:');
    expect(stockImportSection).not.toContain('paidAmount:');
    expect(stockImportSection).not.toContain('paymentStatus:');
    expect(stockImportSection).not.toContain('notes:');
  });
});
