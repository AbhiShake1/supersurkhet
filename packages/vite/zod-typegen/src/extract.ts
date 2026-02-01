import { Project, SyntaxKind, type VariableDeclaration } from 'ts-morph';

export function extractSchemas(filePath: string) {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);
  
  const schemas: { name: string; identifier: string }[] = [];
  
  const exportedVariables = sourceFile.getVariableDeclarations().filter(v => v.isExported());
  
  for (const v of exportedVariables) {
    const type = v.getType();
    const typeText = type.getText();
    const name = v.getName();
    
    console.log(`Checking export: ${name}, Type: ${typeText.slice(0, 100)}...`);
    
    // Check if it's a Zod type
    if (typeText.includes('Zod') || typeText.includes('CreatedSchema') || name.toLowerCase().includes('schema')) {
      // Capitalize for interface name
      const interfaceName = name.charAt(0).toUpperCase() + name.slice(1);
      schemas.push({ name: interfaceName, identifier: name });
    }
  }
  
  return { project, sourceFile, schemas };
}
