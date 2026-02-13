import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';
import type { ZodTypegenOptions } from './index.js';
import { extractDefaultSchema } from './extract.js';

const biomeBinCache = new Map<string, string>();
const outputSignatureCache = new Map<string, string>();

function toPosixPath(input: string) {
  return input.replace(/\\/g, '/');
}

function normalizeNodeModuleSpecifier(specifier: string) {
  const marker = '/node_modules/';
  const index = specifier.lastIndexOf(marker);
  if (index === -1) return null;

  const modulePath = specifier.slice(index + marker.length);

  if (modulePath.startsWith('zod/v3/types')) return 'zod';
  if (modulePath.startsWith('lucide-react/dist/lucide-react')) return 'lucide-react';
  if (modulePath.startsWith('@tabler/icons-react/dist/tabler-icons-react')) {
    return '@tabler/icons-react';
  }
  if (modulePath.startsWith('@types/react/')) return 'react';

  return modulePath.replace(/\/index(?:\.[cm]?js|\.d\.ts|\.ts)?$/, '');
}

function normalizeTypeText(typeText: string, outputFilePath: string) {
  return typeText.replace(/import\("([^"]+)"\)\./g, (_match, rawSpecifier: string) => {
    const specifier = toPosixPath(rawSpecifier);

    const normalizedNodeModule = normalizeNodeModuleSpecifier(specifier);
    if (normalizedNodeModule) {
      return `import("${normalizedNodeModule}").`;
    }

    if (path.isAbsolute(specifier)) {
      const relativePath = toPosixPath(
        path.relative(path.dirname(outputFilePath), specifier),
      );
      const withPrefix = relativePath.startsWith('.')
        ? relativePath
        : `./${relativePath}`;

      return `import("${withPrefix}").`;
    }

    return `import("${specifier}").`;
  });
}

function addTypeLineBreaks(typeText: string) {
  let result = '';
  let inString = false;
  let stringDelimiter = '';
  let escaped = false;

  for (let i = 0; i < typeText.length; i += 1) {
    const char = typeText[i];

    if (inString) {
      result += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === stringDelimiter) {
        inString = false;
        stringDelimiter = '';
      }
      continue;
    }

    if (char === '"' || char === '\'') {
      inString = true;
      stringDelimiter = char;
      result += char;
      continue;
    }

    if (char === '{') {
      result += '{\n';
      continue;
    }
    if (char === '}') {
      if (!result.endsWith('\n')) {
        result += '\n';
      }
      result += '}';
      continue;
    }
    if (char === ';') {
      result += ';\n';
      continue;
    }

    result += char;
  }

  return result.replace(/\n[ \t]*\n/g, '\n');
}

function formatWithBiome(content: string, outputPath: string) {
  const projectRoot = path.resolve(outputPath, '..', '..', '..');
  let biomeBin = biomeBinCache.get(projectRoot);

  if (!biomeBin) {
    let current = projectRoot;
    while (true) {
      const candidate = path.join(current, 'node_modules', '.bin', 'biome');
      if (fs.existsSync(candidate)) {
        biomeBin = candidate;
        biomeBinCache.set(projectRoot, candidate);
        break;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        throw new Error(
          `[zod-typegen] Could not find Biome binary from ${projectRoot}`,
        );
      }
      current = parent;
    }
  }

  const result = spawnSync(
    biomeBin,
    ['format', '--stdin-file-path', outputPath],
    {
      input: content,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      cwd: projectRoot,
      shell: process.platform === 'win32',
    },
  );

  if (result.error) {
    throw new Error(`[zod-typegen] Failed to run Biome: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(
      `[zod-typegen] Biome format failed (exit ${result.status})${stderr ? `: ${stderr}` : ''}`,
    );
  }

  if (!result.stdout) {
    throw new Error('[zod-typegen] Biome returned empty formatted output');
  }

  return result.stdout;
}

export function generate(options: ZodTypegenOptions) {
  const { project, schema, sourceFile } = extractDefaultSchema(options.entry);
  const checker = project.getTypeChecker();
  if (!sourceFile) return;

  if (!schema) return;

  function getSchemaInfo() {
    const v = sourceFile.getVariableDeclaration(schema.identifier);
    if (!v) return null;
    const type = v.getType();

    let outputSymbol = type.getProperty('_output');
    // Support CreatedSchema wrapper which has a schemaShape property
    if (!outputSymbol) {
      const schemaShapeSymbol = type.getProperty('schemaShape');
      if (schemaShapeSymbol) {
        const schemaShapeType = checker.getTypeOfSymbolAtLocation(
          schemaShapeSymbol,
          v.getNameNode(),
        );
        outputSymbol = schemaShapeType.getProperty('_output');
      }
    }

    if (!outputSymbol) return null;

    return {
      name: schema.name,
      identifier: schema.identifier,
      typeText: normalizeTypeText(v.getType().getText(), options.output),
      variable: v,
    };
  }

  const schemaInfo = getSchemaInfo();

  if (!schemaInfo) return;
  const signature = `${schemaInfo.name}::${schemaInfo.typeText}`;
  const outputPath = path.resolve(options.output);
  if (outputSignatureCache.get(outputPath) === signature) {
    return;
  }

  const readableTypeText = addTypeLineBreaks(schemaInfo.typeText)
    .split('\n')
    .map((line) => (line.length ? `    ${line}` : line))
    .join('\n');

  const content = `/* eslint-disable */
/* This file is auto-generated by zod-typegen. Do not edit manually. */

declare global {
  type ${schemaInfo.name} =
${readableTypeText};
}

export {};
`;

  const outputDir = path.dirname(options.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const formattedContent = formatWithBiome(content, outputPath);
  if (fs.existsSync(outputPath)) {
    const existing = fs.readFileSync(outputPath, 'utf8');
    if (existing === formattedContent) {
      outputSignatureCache.set(outputPath, signature);
      return;
    }
  }

  fs.writeFileSync(options.output, formattedContent);
  outputSignatureCache.set(outputPath, signature);
  console.log(`[zod-typegen] Generated ${options.output}`);
}
