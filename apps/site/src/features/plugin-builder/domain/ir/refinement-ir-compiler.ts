import type {
  ExpressionDoc,
  RefineIssueIR,
  SchemaDoc,
  SchemaFieldDoc,
} from '@supersurkhet/sdk';

export type VisualRefinementRule = {
  id: string;
  code?: RefineIssueIR['code'];
  message: string;
  when: ExpressionDoc;
  paths?: string[][];
};

export type RefinementIrCompilerDiagnostic = {
  code: 'invalid-path' | 'invalid-scope';
  ruleId: string;
  path: string[];
  message: string;
};

export type CompileRefinementIrInput = {
  schema: Pick<SchemaDoc, 'schemaId' | 'fields'>;
  rules: readonly VisualRefinementRule[];
  pathScope?: string[];
};

export type CompileRefinementIrResult = {
  refinements: RefineIssueIR[];
  diagnostics: RefinementIrCompilerDiagnostic[];
};

type FieldPathNode = {
  key: string;
  children: FieldPathNode[];
};

export function compileRefinementIr(
  input: CompileRefinementIrInput,
): CompileRefinementIrResult {
  const fieldGraph = buildFieldPathNodes(input.schema.fields);
  const diagnostics: RefinementIrCompilerDiagnostic[] = [];
  const refinements: RefineIssueIR[] = [];

  if (
    input.pathScope &&
    input.pathScope.length > 0 &&
    !pathResolves(fieldGraph, input.pathScope)
  ) {
    diagnostics.push({
      code: 'invalid-scope',
      ruleId: '__scope__',
      path: input.pathScope,
      message: `Refinement scope "${formatPath(input.pathScope)}" does not resolve to a schema field`,
    });
    return {
      refinements,
      diagnostics,
    };
  }

  const sortedRules = [...input.rules].sort((left, right) =>
    left.id.localeCompare(right.id),
  );

  for (const rule of sortedRules) {
    const defaultIssue = {
      code: rule.code ?? 'custom',
      message: rule.message,
      when: rule.when,
    } satisfies Omit<RefineIssueIR, 'path'>;

    if (!rule.paths || rule.paths.length === 0) {
      refinements.push(defaultIssue);
      continue;
    }

    const sortedPaths = [...rule.paths]
      .map((path) => [...path])
      .sort((left, right) =>
        left.join('\u0000').localeCompare(right.join('\u0000')),
      );

    for (const path of sortedPaths) {
      if (path.length === 0) {
        diagnostics.push({
          code: 'invalid-path',
          ruleId: rule.id,
          path,
          message: 'Refinement path must not be empty',
        });
        continue;
      }

      const absolutePath = input.pathScope
        ? [...input.pathScope, ...path]
        : path;
      if (!pathResolves(fieldGraph, absolutePath)) {
        diagnostics.push({
          code: 'invalid-path',
          ruleId: rule.id,
          path,
          message: `Refinement path "${formatPath(absolutePath)}" does not resolve to a schema field`,
        });
        continue;
      }

      refinements.push({
        ...defaultIssue,
        path,
      });
    }
  }

  return {
    refinements,
    diagnostics,
  };
}

function buildFieldPathNodes(
  fields: readonly SchemaFieldDoc[],
): FieldPathNode[] {
  return fields.map((field) => ({
    key: field.key,
    children: resolveChildren(field),
  }));
}

function resolveChildren(field: SchemaFieldDoc): FieldPathNode[] {
  if (field.type === 'object') {
    return buildFieldPathNodes(field.fields ?? []);
  }

  if (field.type === 'array' && field.itemType?.type === 'object') {
    return buildFieldPathNodes(field.itemType.fields ?? []);
  }

  return [];
}

function pathResolves(
  nodes: readonly FieldPathNode[],
  path: readonly string[],
) {
  let cursor = nodes;

  for (const segment of path) {
    const match = cursor.find((node) => node.key === segment);
    if (!match) {
      return false;
    }
    cursor = match.children;
  }

  return true;
}

function formatPath(path: readonly string[]) {
  return path.join('.');
}
