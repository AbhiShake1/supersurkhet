import { Project } from 'ts-morph';

export function extractDefaultSchema(filePath: string) {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);

  const exportedVariable = sourceFile.getVariableDeclarations().find(v => v.isDefaultExport());

  if (!exportedVariable) {
    console.warn(`No default export found for ${filePath}`);
    return { project, sourceFile };
  }

  const name = exportedVariable.getName();

  const interfaceName = "Base" + name.charAt(0).toUpperCase() + name.slice(1) + "Type";
  const schema = { name: interfaceName, identifier: name }

  return { project, sourceFile, schema };
}
