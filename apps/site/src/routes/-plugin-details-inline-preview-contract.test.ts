import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginDetailsRoutePath = resolve(
  process.cwd(),
  'src/routes/$businessName/admin/plugin/$pluginId.tsx',
);

function getRouteContent() {
  return readFileSync(pluginDetailsRoutePath, 'utf8');
}

describe('plugin details inline preview contract', () => {
  it('keeps compact icon-slot preview while restoring full dialog preview for try it out', () => {
    const content = getRouteContent();

    expect(content).toContain('PluginPreviewDialog');
    expect(content).toContain(
      'const [isPreviewOpen, setIsPreviewOpen] = useState(false);',
    );
    expect(content).toContain('onClick={() => setIsPreviewOpen(true)}');
    expect(content).toContain('<PluginPreviewDialog');
    expect(content).toContain('open={isPreviewOpen}');
    expect(content).toContain('onOpenChange={setIsPreviewOpen}');
    expect(content).not.toContain('Direct preview');
    expect(content).toContain('const iconPreviewSchemaKey =');
    expect(content).toContain('const activePreviewTabKey =');
    expect(content).toContain('slug={businessId}');
    expect(content).not.toContain('scrollIntoView');
    expect(content).toContain('<AutoTable<SchemaKeys>');
    expect(content).toContain(
      'className="size-44 overflow-hidden rounded-3xl border border-border/70 bg-muted/20"',
    );
    expect(content).not.toContain(
      'className="size-44 rounded-3xl border border-dashed border-border bg-muted/40 text-sm font-medium text-muted-foreground"',
    );
  });
});
