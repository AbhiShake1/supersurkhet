import { useMemo } from 'react';
import { CodeBlock } from '@/components/ui/ui-builder/components/codeblock';
import { useLayerStore } from '@/lib/ui-builder/store/layer-store';
import { cn } from '@/lib/utils';
import type { ComponentLayer } from '../types';

export function CodePanel({ className }: { className?: string }) {
  const selectedPageId = useLayerStore((state) => state.selectedPageId);
  const findLayerById = useLayerStore((state) => state.findLayerById);

  const page = findLayerById(selectedPageId) as ComponentLayer;
  const codeBlocks = useMemo(() => {
    return {
      layers: JSON.stringify(
        page,
        (_key, value) => (typeof value === 'function' ? undefined : value),
        2,
      ),
    };
  }, [page]);

  return <CodeContent codeBlocks={codeBlocks} className={className} />;
}

const CodeContent = ({
  codeBlocks,
  className,
}: {
  codeBlocks: Record<'layers', string>;
  className?: string;
}) => {
  return (
    <div className={cn('space-y-4 w-full overflow-hidden', className)}>
      <div className="relative">
        <div className="overflow-auto max-h-[200px] w-full">
          <CodeBlock language="json" value={codeBlocks.layers} />
        </div>
      </div>
    </div>
  );
};
