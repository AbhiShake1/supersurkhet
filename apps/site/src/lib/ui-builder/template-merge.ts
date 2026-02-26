import type { ComponentLayer } from '@/components/ui/ui-builder/types';

export type TemplateMergeConflictCode =
  | 'id-type-mismatch'
  | 'children-shape-mismatch'
  | 'duplicate-id';

export type TemplateMergeConflict = {
  code: TemplateMergeConflictCode;
  message: string;
  pageKey: string;
  path: string;
  layerId: string;
  targetType?: string;
  templateType?: string;
  source?: 'template' | 'target';
};

export type TemplateMergeResult = {
  layers: ComponentLayer[];
  summary: {
    pagesAdded: number;
    pagesMerged: number;
    hardConflicts: number;
  };
  hardConflicts: TemplateMergeConflict[];
};

function normalizePageKey(page: ComponentLayer) {
  return (page.name || page.id).trim().toLowerCase();
}

function cloneLayer(layer: ComponentLayer): ComponentLayer {
  return structuredClone(layer);
}

function childShape(value: ComponentLayer[] | string): 'array' | 'string' {
  return Array.isArray(value) ? 'array' : 'string';
}

function collectDuplicateIdConflicts({
  root,
  pageKey,
  source,
}: {
  root: ComponentLayer;
  pageKey: string;
  source: 'template' | 'target';
}): TemplateMergeConflict[] {
  const seen = new Map<string, string>();
  const conflicts: TemplateMergeConflict[] = [];

  const visit = (layer: ComponentLayer, path: string) => {
    const existingPath = seen.get(layer.id);
    if (existingPath) {
      conflicts.push({
        code: 'duplicate-id',
        message: `Duplicate layer id "${layer.id}" found in ${source} tree`,
        pageKey,
        path,
        layerId: layer.id,
        source,
      });
      return;
    }
    seen.set(layer.id, path);
    if (Array.isArray(layer.children)) {
      layer.children.forEach((child, index) => {
        visit(child, `${path}.children[${index}]`);
      });
    }
  };

  visit(root, 'root');
  return conflicts;
}

function mergeNode({
  target,
  template,
  pageKey,
  path,
}: {
  target: ComponentLayer;
  template: ComponentLayer;
  pageKey: string;
  path: string;
}): { merged: ComponentLayer; conflicts: TemplateMergeConflict[] } {
  const conflicts: TemplateMergeConflict[] = [];
  const sameId = target.id === template.id;

  if (sameId && target.type !== template.type) {
    return {
      merged: cloneLayer(target),
      conflicts: [
        {
          code: 'id-type-mismatch',
          message: `Layer "${target.id}" type mismatch (${target.type} vs ${template.type})`,
          pageKey,
          path,
          layerId: target.id,
          targetType: target.type,
          templateType: template.type,
        },
      ],
    };
  }

  const merged: ComponentLayer = {
    ...cloneLayer(target),
    name: template.name ?? target.name,
    type: target.type,
    props: {
      ...target.props,
      ...template.props,
    },
  };

  const targetChildren = target.children;
  const templateChildren = template.children;

  if (sameId && childShape(targetChildren) !== childShape(templateChildren)) {
    return {
      merged: cloneLayer(target),
      conflicts: [
        {
          code: 'children-shape-mismatch',
          message: `Layer "${target.id}" has incompatible children shapes`,
          pageKey,
          path,
          layerId: target.id,
          targetType: childShape(targetChildren),
          templateType: childShape(templateChildren),
        },
      ],
    };
  }

  if (Array.isArray(targetChildren) && Array.isArray(templateChildren)) {
    const nextChildren = targetChildren.map(cloneLayer);
    const indexById = new Map<string, number>();
    nextChildren.forEach((child, index) => {
      indexById.set(child.id, index);
    });

    for (const templateChild of templateChildren) {
      const targetIndex = indexById.get(templateChild.id);
      if (targetIndex === undefined) {
        nextChildren.push(cloneLayer(templateChild));
        continue;
      }
      const childResult = mergeNode({
        target: nextChildren[targetIndex] as ComponentLayer,
        template: templateChild,
        pageKey,
        path: `${path}.${templateChild.id}`,
      });
      conflicts.push(...childResult.conflicts);
      nextChildren[targetIndex] = childResult.merged;
    }
    merged.children = nextChildren;
    return {
      merged,
      conflicts,
    };
  }

  if (!Array.isArray(targetChildren) && !Array.isArray(templateChildren)) {
    merged.children = templateChildren;
    return {
      merged,
      conflicts,
    };
  }

  merged.children = Array.isArray(targetChildren)
    ? targetChildren.map(cloneLayer)
    : targetChildren;
  return {
    merged,
    conflicts,
  };
}

export function mergeUiTemplateLayers({
  targetLayers,
  templateLayers,
}: {
  targetLayers: ComponentLayer[];
  templateLayers: ComponentLayer[];
}): TemplateMergeResult {
  const mergedLayers = targetLayers.map(cloneLayer);
  const hardConflicts: TemplateMergeConflict[] = [];
  let pagesAdded = 0;
  let pagesMerged = 0;

  const pageIndexByKey = new Map<string, number>();
  mergedLayers.forEach((page, index) => {
    pageIndexByKey.set(normalizePageKey(page), index);
  });

  for (const templatePage of templateLayers) {
    const pageKey = normalizePageKey(templatePage);
    const targetIndex = pageIndexByKey.get(pageKey);

    if (targetIndex === undefined) {
      mergedLayers.push(cloneLayer(templatePage));
      pagesAdded += 1;
      continue;
    }

    const targetPage = mergedLayers[targetIndex] as ComponentLayer;
    hardConflicts.push(
      ...collectDuplicateIdConflicts({
        root: targetPage,
        pageKey,
        source: 'target',
      }),
    );
    hardConflicts.push(
      ...collectDuplicateIdConflicts({
        root: templatePage,
        pageKey,
        source: 'template',
      }),
    );

    const mergedPage = mergeNode({
      target: targetPage,
      template: templatePage,
      pageKey,
      path: pageKey,
    });

    hardConflicts.push(...mergedPage.conflicts);
    if (mergedPage.conflicts.length === 0) {
      mergedLayers[targetIndex] = mergedPage.merged;
      pagesMerged += 1;
    }
  }

  return {
    layers:
      hardConflicts.length > 0 ? targetLayers.map(cloneLayer) : mergedLayers,
    summary: {
      pagesAdded,
      pagesMerged,
      hardConflicts: hardConflicts.length,
    },
    hardConflicts,
  };
}
