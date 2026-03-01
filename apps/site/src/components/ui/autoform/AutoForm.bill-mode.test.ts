import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(pathFromSrc: string) {
  return readFileSync(resolve(process.cwd(), `src/${pathFromSrc}`), 'utf8');
}

describe('AutoForm bill mode contracts', () => {
  it('auto-detects bill metadata and routes to bill layout', () => {
    const content = readSource('components/ui/autoform/react/AutoForm.tsx');

    expect(content).toContain('getSchemaBillConfig(schemaSource as never)');
    expect(content).toContain('<BillFormLayout');
    expect(content).toContain('parsedSchema.fields.map((field) => (');
  });

  it('line items table keeps stable test ids and field-array behavior', () => {
    const content = readSource(
      'components/ui/autoform/bill/BillLineItemsTable.tsx',
    );

    expect(content).toContain('useFieldArray');
    expect(content).toContain('data-testid="af-bill-table"');
    expect(content).toContain(`data-testid={\`af-bill-row-\${rowIndex}\`}`);
    expect(content).toContain(`data-testid={\`af-add-\${lineItemsField}\`}`);
    expect(content).toContain('onKeyDownCapture');
  });

  it('bill layout keeps non-line-item detail fields rendered', () => {
    const content = readSource(
      'components/ui/autoform/bill/BillFormLayout.tsx',
    );

    expect(content).toContain('field.key !== normalized.lineItemsField');
    expect(content).toContain('normalized.detailFields.length > 0');
    expect(content).toContain(`key={\`bill-detail-\${field.key}\`}`);
    expect(content).toContain('resolvedArraySections');
    expect(content).toContain('footerFields.length > 0');
  });
});
