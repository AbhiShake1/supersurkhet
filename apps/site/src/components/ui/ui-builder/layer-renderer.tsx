import React from "react";

import { type EditorConfig, RenderLayer } from "@/components/ui/ui-builder/internal/utils/render-utils";
import { DevProfiler } from "@/components/ui/ui-builder/internal/components/dev-profiler";

import type { ComponentLayer, ComponentRegistry } from '@/components/ui/ui-builder/types';

interface LayerRendererProps<TRegistry extends ComponentRegistry = ComponentRegistry> {
  className?: string;
  page: ComponentLayer;
  editorConfig?: EditorConfig;
  componentRegistry: TRegistry;
}

const LayerRenderer = React.memo<LayerRendererProps>(function LayerRenderer({
  className,
  page,
  editorConfig,
  componentRegistry,
}) {
  return (
    <DevProfiler id="LayerRenderer" threshold={30}>
      <div className={className} >
        <RenderLayer
          layer={page}
          editorConfig={editorConfig}
          componentRegistry={componentRegistry}
        />
      </div>
    </DevProfiler>
  );
}) as <TRegistry extends ComponentRegistry = ComponentRegistry>(
  props: LayerRendererProps<TRegistry>
) => JSX.Element;

export default LayerRenderer;

