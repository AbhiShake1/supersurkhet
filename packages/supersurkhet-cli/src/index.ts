#!/usr/bin/env node

import { generateSchemaTypes, type PluginDefinition, type SchemaDoc } from '@supersurkhet/sdk';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

type CliError = {
  message: string;
  code?: number;
};

type RelaySnapshot = {
  version: 1;
  updatedAt: string;
  projectId?: string;
  endpoint?: string;
  schemaDocs: SchemaDoc[];
};

type LinkConfig = {
  projectId: string;
  endpoint?: string;
  linkedAt: string;
};

const DEFAULT_CONFIG_PATH = 'supersurkhet.config.mjs';
const DEFAULT_STORE_PATH = '.supersurkhet/relay-store.json';
const DEFAULT_LINK_PATH = '.supersurkhet/project.json';
const DEFAULT_ENDPOINT = 'https://api.supersurkhet.com';

async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === '--help' || command === '-h') {
      printHelp();
      return;
    }

    if (command === '--version' || command === '-v') {
      const packageJsonPath = path.resolve(import.meta.dirname, '../package.json');
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { version: string };
      console.log(packageJson.version);
      return;
    }

    switch (command) {
      case 'new':
        await runNew(args.slice(1));
        return;
      case 'types':
        await runTypes(args.slice(1));
        return;
      case 'sync-up':
        await runSyncUp(args.slice(1));
        return;
      case 'sync-down':
        await runSyncDown(args.slice(1));
        return;
      case 'link':
        await runLink(args.slice(1));
        return;
      default:
        throw {
          message: `Unknown command "${command}". Run "supersurkhet --help" for usage.`,
          code: 1,
        } satisfies CliError;
    }
  } catch (error) {
    const normalized = normalizeError(error);
    console.error(`supersurkhet: ${normalized.message}`);
    process.exit(normalized.code ?? 1);
  }
}

function printHelp() {
  console.log(`supersurkhet CLI\n
Usage:
  supersurkhet <command> [options]

Commands:
  new <name>                               Scaffold a new plugin project
  types [--config <file>] [--out <file>]   Generate schema TS types
  sync-up [--config <file>] [--store <file>]    Push schema docs to local relay store
  sync-down [--store <file>] [--out <file>]     Pull schema docs from local relay store
  link --project <id> [--endpoint <url>]        Save local project connection metadata

Global options:
  -h, --help      Show help
  -v, --version   Show CLI version
`);
}

async function runNew(args: string[]) {
  const name = args[0];
  if (!name) {
    throw {
      message: 'Missing project name. Usage: supersurkhet new <name>',
      code: 1,
    } satisfies CliError;
  }

  const targetDir = path.resolve(process.cwd(), name);
  if (existsSync(targetDir)) {
    throw {
      message: `Directory already exists: ${targetDir}`,
      code: 1,
    } satisfies CliError;
  }

  await mkdir(path.join(targetDir, 'src'), { recursive: true });
  await mkdir(path.join(targetDir, 'supersurkhet'), { recursive: true });

  const packageJson = {
    name,
    private: true,
    type: 'module',
    scripts: {
      types: 'supersurkhet types --config supersurkhet.config.mjs --out supersurkhet/schema.types.ts',
      'sync:up': 'supersurkhet sync-up --config supersurkhet.config.mjs',
      'sync:down': 'supersurkhet sync-down --out supersurkhet/schema.synced.json',
    },
    dependencies: {
      '@supersurkhet/sdk': '^0.0.1',
    },
    devDependencies: {
      '@supersurkhet/cli': '^0.0.1',
    },
  };

  const configMjs = `import { definePlugin, defineSchemaDoc } from '@supersurkhet/sdk';

const productSchema = defineSchemaDoc({
  schemaId: 'product',
  title: 'Product',
  fields: [
    {
      key: 'name',
      type: 'string',
      dataType: 'string',
      fieldType: 'string',
    },
    {
      key: 'price',
      type: 'number',
      dataType: 'number',
      fieldType: 'currency',
    },
  ],
});

export default definePlugin({
  pluginId: '${name}',
  version: '0.0.1',
  schemaDocs: [productSchema],
});
`;

  const readme = `# ${name}

## Quickstart

1. Install deps

\`\`\`bash
npm install
\`\`\`

2. Generate types

\`\`\`bash
npm run types
\`\`\`

3. Sync schema docs

\`\`\`bash
npm run sync:up
npm run sync:down
\`\`\`
`;

  await writeFile(path.join(targetDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  await writeFile(path.join(targetDir, 'supersurkhet.config.mjs'), configMjs);
  await writeFile(path.join(targetDir, 'README.md'), readme);
  await writeFile(path.join(targetDir, '.gitignore'), 'node_modules\n.supersurkhet\n');

  console.log(`Created Supersurkhet project at ${targetDir}`);
  console.log('Next:');
  console.log(`  cd ${name}`);
  console.log('  npm install');
  console.log('  npm run types');
}

async function runTypes(args: string[]) {
  const configPath = resolveOption(args, '--config') ?? DEFAULT_CONFIG_PATH;
  const outPath = resolveOption(args, '--out') ?? 'supersurkhet/schema.types.ts';

  const plugin = await loadPluginConfig(configPath);
  const schemaDocs = plugin.schemaDocs ?? [];
  const output = generateSchemaTypes(schemaDocs);

  const absoluteOutPath = path.resolve(process.cwd(), outPath);
  await mkdir(path.dirname(absoluteOutPath), { recursive: true });
  await writeFile(absoluteOutPath, `${output}\n`);

  console.log(`Generated schema types from ${schemaDocs.length} schema(s) -> ${absoluteOutPath}`);
}

async function runSyncUp(args: string[]) {
  const configPath = resolveOption(args, '--config') ?? DEFAULT_CONFIG_PATH;
  const storePath = resolveOption(args, '--store') ?? DEFAULT_STORE_PATH;

  const plugin = await loadPluginConfig(configPath);
  const link = await maybeReadJson<LinkConfig>(path.resolve(process.cwd(), DEFAULT_LINK_PATH));

  const snapshot: RelaySnapshot = {
    version: 1,
    updatedAt: new Date().toISOString(),
    projectId: link?.projectId,
    endpoint: link?.endpoint,
    schemaDocs: plugin.schemaDocs ?? [],
  };

  const absoluteStorePath = path.resolve(process.cwd(), storePath);
  await mkdir(path.dirname(absoluteStorePath), { recursive: true });
  await writeFile(absoluteStorePath, `${JSON.stringify(snapshot, null, 2)}\n`);

  console.log(
    `Synced up ${snapshot.schemaDocs.length} schema(s) from ${path.resolve(process.cwd(), configPath)} -> ${absoluteStorePath}`,
  );
}

async function runSyncDown(args: string[]) {
  const storePath = resolveOption(args, '--store') ?? DEFAULT_STORE_PATH;
  const outPath = resolveOption(args, '--out') ?? 'supersurkhet/schema.synced.json';

  const absoluteStorePath = path.resolve(process.cwd(), storePath);
  if (!existsSync(absoluteStorePath)) {
    throw {
      message: `Store not found: ${absoluteStorePath}. Run "supersurkhet sync-up" first.`,
      code: 1,
    } satisfies CliError;
  }

  const snapshot = await readJson<RelaySnapshot>(absoluteStorePath);
  const absoluteOutPath = path.resolve(process.cwd(), outPath);

  await mkdir(path.dirname(absoluteOutPath), { recursive: true });
  await writeFile(
    absoluteOutPath,
    `${JSON.stringify(
      {
        projectId: snapshot.projectId,
        endpoint: snapshot.endpoint,
        updatedAt: snapshot.updatedAt,
        schemaDocs: snapshot.schemaDocs,
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Synced down ${snapshot.schemaDocs.length} schema(s) -> ${absoluteOutPath}`);
}

async function runLink(args: string[]) {
  const projectId = resolveOption(args, '--project');
  if (!projectId) {
    throw {
      message: 'Missing --project. Usage: supersurkhet link --project <id> [--endpoint <url>]',
      code: 1,
    } satisfies CliError;
  }

  const endpoint = resolveOption(args, '--endpoint') ?? DEFAULT_ENDPOINT;
  const link: LinkConfig = {
    projectId,
    endpoint,
    linkedAt: new Date().toISOString(),
  };

  const absoluteLinkPath = path.resolve(process.cwd(), DEFAULT_LINK_PATH);
  await mkdir(path.dirname(absoluteLinkPath), { recursive: true });
  await writeFile(absoluteLinkPath, `${JSON.stringify(link, null, 2)}\n`);

  console.log(`Linked current directory to project "${projectId}" (${endpoint})`);
}

function resolveOption(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    throw {
      message: `Missing value for ${flag}`,
      code: 1,
    } satisfies CliError;
  }
  return value;
}

async function loadPluginConfig(configPath: string): Promise<PluginDefinition> {
  const absoluteConfigPath = path.resolve(process.cwd(), configPath);
  if (!existsSync(absoluteConfigPath)) {
    throw {
      message: `Config not found: ${absoluteConfigPath}`,
      code: 1,
    } satisfies CliError;
  }

  const fileUrl = pathToFileURL(absoluteConfigPath);
  fileUrl.searchParams.set('t', Date.now().toString());

  let loaded: unknown;
  try {
    loaded = await import(fileUrl.href);
  } catch (error) {
    throw {
      message: `Failed to import config ${absoluteConfigPath}: ${normalizeError(error).message}`,
      code: 1,
    } satisfies CliError;
  }

  const plugin = (loaded as { default?: unknown }).default;
  if (!plugin || typeof plugin !== 'object') {
    throw {
      message: `Config default export must be a plugin object. Got: ${String(plugin)}`,
      code: 1,
    } satisfies CliError;
  }

  const typed = plugin as PluginDefinition;
  if (!typed.pluginId || !typed.version) {
    throw {
      message: 'Config plugin must include pluginId and version.',
      code: 1,
    } satisfies CliError;
  }

  return typed;
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function maybeReadJson<T>(filePath: string): Promise<T | undefined> {
  if (!existsSync(filePath)) {
    return undefined;
  }
  return readJson<T>(filePath);
}

function normalizeError(error: unknown): CliError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  ) {
    const candidate = error as { message: string; code?: unknown };
    return {
      message: candidate.message,
      code: typeof candidate.code === 'number' ? candidate.code : 1,
    };
  }

  return {
    message: String(error),
    code: 1,
  };
}

void main();
