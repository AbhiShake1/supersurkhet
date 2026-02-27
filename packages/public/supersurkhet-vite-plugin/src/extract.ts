import fs from 'node:fs';
import path from 'node:path';
import { Project } from 'ts-morph';

const projectCache = new Map<string, Project>();

function findNearestTsconfig(startPath: string) {
  let current = path.dirname(path.resolve(startPath));

  while (true) {
    const candidate = path.join(current, 'tsconfig.json');
    if (fs.existsSync(candidate)) return candidate;

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function extractDefaultSchema(filePath: string) {
  const resolvedFile = path.resolve(filePath);
  const tsconfigPath = findNearestTsconfig(resolvedFile);
  const cacheKey = tsconfigPath ?? `no-tsconfig:${path.dirname(resolvedFile)}`;

  let project = projectCache.get(cacheKey);
  if (!project) {
    project = tsconfigPath
      ? new Project({ tsConfigFilePath: tsconfigPath })
      : new Project();
    projectCache.set(cacheKey, project);
  }

  const sourceFile =
    project.addSourceFileAtPathIfExists(resolvedFile) ??
    project.addSourceFileAtPath(resolvedFile);
  sourceFile.refreshFromFileSystemSync();

  const exportedVariable = sourceFile
    .getVariableDeclarations()
    .find((v) => v.isDefaultExport());

  if (!exportedVariable) {
    console.warn(`No default export found for ${filePath}`);
    return { project, sourceFile };
  }

  const name = exportedVariable.getName();
  const interfaceName = `Base${name.charAt(0).toUpperCase()}${name.slice(1)}Type`;
  const schema = { name: interfaceName, identifier: name };

  return { project, sourceFile, schema };
}
