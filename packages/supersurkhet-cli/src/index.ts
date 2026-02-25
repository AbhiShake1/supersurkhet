#!/usr/bin/env node

import { generateSchemaTypes, type PluginDefinition, type SchemaDoc } from '@supersurkhet/sdk';
import { homedir } from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

type CliError = {
  message: string;
  code?: number;
};

type LinkConfig = {
  projectId: string;
  endpoint: string;
  linkedAt: string;
};

type CredentialsFile = {
  version: 1;
  endpoints: Record<
    string,
    {
      token: string;
      updatedAt: string;
    }
  >;
};

type SyncSnapshotResponse = {
  projectId: string;
  pluginId: string;
  revisionId: string;
  updatedAt: string;
  schemaDocs: SchemaDoc[];
};

type TokenMeta = {
  id: string;
  projectId: string;
  userId: string;
  name?: string;
  tokenPrefix: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  rotatedFromTokenId?: string;
};

const DEFAULT_CONFIG_PATH = 'supersurkhet.config.mjs';
const DEFAULT_LINK_PATH = '.supersurkhet/project.json';
const DEFAULT_ENDPOINT = 'http://localhost:3000';
const USER_HOME_DIR = homedir();
const CREDENTIALS_PATH = path.join(USER_HOME_DIR, '.supersurkhet', 'credentials.json');

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
      case 'token':
        await runToken(args.slice(1));
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
  new <name>                                            Scaffold a new plugin project
  types [--config <file>] [--out <file>]                Generate schema TS types
  link --project <id> [--endpoint <url>] [--token <t>]  Link local dir to remote project
  token issue [--name <name>] [--project <id>] [--endpoint <url>] [--token <t>]
                                                         Issue a new project-scoped CLI token
  token list [--project <id>] [--endpoint <url>] [--token <t>]
                                                         List tokens for current user/project
  token rotate --token-id <id> [--name <name>] [--project <id>] [--endpoint <url>] [--token <t>]
                                                         Rotate an existing token
  token revoke --token-id <id> [--project <id>] [--endpoint <url>] [--token <t>]
                                                         Revoke an existing token
  sync-up [--config <file>] [--project <id>] [--endpoint <url>] [--token <t>]
                                                         Push schema docs to remote project
  sync-down [--config <file>] [--plugin <id>] [--project <id>] [--endpoint <url>] [--token <t>] [--out <file>]
                                                         Pull schema docs from remote project

Auth token resolution order:
  1) --token
  2) SUPERSURKHET_TOKEN env var
  3) ~/.supersurkhet/credentials.json (saved by link)

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
      'sync:down':
        'supersurkhet sync-down --config supersurkhet.config.mjs --out supersurkhet/schema.synced.json',
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

3. Link to your remote project

\`\`\`bash
npx supersurkhet link --project <project-id> --endpoint http://localhost:3000 --token <api-token>
\`\`\`

4. Sync schema docs

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

async function runLink(args: string[]) {
  const projectId = resolveOption(args, '--project');
  if (!projectId) {
    throw {
      message: 'Missing --project. Usage: supersurkhet link --project <id> [--endpoint <url>] [--token <token>]',
      code: 1,
    } satisfies CliError;
  }

  const endpoint = normalizeEndpoint(resolveOption(args, '--endpoint') ?? DEFAULT_ENDPOINT);
  const token = await resolveToken(endpoint, resolveOption(args, '--token'));

  await requestJson<unknown>({
    method: 'GET',
    url: `${endpoint}/v1/cli/projects/${encodeURIComponent(projectId)}`,
    token,
  });

  const link: LinkConfig = {
    projectId,
    endpoint,
    linkedAt: new Date().toISOString(),
  };

  const absoluteLinkPath = path.resolve(process.cwd(), DEFAULT_LINK_PATH);
  await mkdir(path.dirname(absoluteLinkPath), { recursive: true });
  await writeFile(absoluteLinkPath, `${JSON.stringify(link, null, 2)}\n`);

  await saveToken(endpoint, token);

  console.log(`Linked current directory to project "${projectId}" (${endpoint})`);
}

async function runToken(args: string[]) {
  const subcommand = args[0];
  const subArgs = args.slice(1);

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    console.log(`Token subcommands:
  supersurkhet token issue [--name <name>] [--project <id>] [--endpoint <url>] [--token <t>]
  supersurkhet token list [--project <id>] [--endpoint <url>] [--token <t>]
  supersurkhet token rotate --token-id <id> [--name <name>] [--project <id>] [--endpoint <url>] [--token <t>]
  supersurkhet token revoke --token-id <id> [--project <id>] [--endpoint <url>] [--token <t>]
`);
    return;
  }

  if (subcommand === 'issue') {
    await runTokenIssue(subArgs);
    return;
  }
  if (subcommand === 'list') {
    await runTokenList(subArgs);
    return;
  }
  if (subcommand === 'rotate') {
    await runTokenRotate(subArgs);
    return;
  }
  if (subcommand === 'revoke') {
    await runTokenRevoke(subArgs);
    return;
  }

  throw {
    message: `Unknown token command "${subcommand}".`,
    code: 1,
  } satisfies CliError;
}

async function runTokenIssue(args: string[]) {
  const link = await resolveLink(
    resolveOption(args, '--project'),
    resolveOption(args, '--endpoint'),
  );
  const token = await resolveToken(link.endpoint, resolveOption(args, '--token'));
  const name = resolveOption(args, '--name');

  const response = await requestJson<{
    token: string;
    tokenMeta: TokenMeta;
  }>({
    method: 'POST',
    url: `${link.endpoint}/v1/cli/projects/${encodeURIComponent(link.projectId)}/tokens`,
    token,
    body: name ? { name } : {},
  });

  await saveToken(link.endpoint, response.token);

  console.log(`Issued token ${response.tokenMeta.id} for project "${link.projectId}"`);
  console.log(`Token: ${response.token}`);
  console.log(`Saved issued token for endpoint ${link.endpoint}`);
}

async function runTokenList(args: string[]) {
  const link = await resolveLink(
    resolveOption(args, '--project'),
    resolveOption(args, '--endpoint'),
  );
  const token = await resolveToken(link.endpoint, resolveOption(args, '--token'));

  const response = await requestJson<{
    tokens: TokenMeta[];
  }>({
    method: 'GET',
    url: `${link.endpoint}/v1/cli/projects/${encodeURIComponent(link.projectId)}/tokens`,
    token,
  });

  if (response.tokens.length === 0) {
    console.log(`No tokens found for project "${link.projectId}" and current user.`);
    return;
  }

  for (const tokenMeta of response.tokens) {
    console.log(
      `${tokenMeta.id}  name=${tokenMeta.name ?? '-'}  prefix=${tokenMeta.tokenPrefix}  revoked=${tokenMeta.revokedAt ?? 'no'}`,
    );
  }
}

async function runTokenRotate(args: string[]) {
  const tokenId = resolveOption(args, '--token-id');
  if (!tokenId) {
    throw {
      message: 'Missing --token-id. Usage: supersurkhet token rotate --token-id <id> [--name <name>]',
      code: 1,
    } satisfies CliError;
  }

  const link = await resolveLink(
    resolveOption(args, '--project'),
    resolveOption(args, '--endpoint'),
  );
  const token = await resolveToken(link.endpoint, resolveOption(args, '--token'));
  const name = resolveOption(args, '--name');

  const response = await requestJson<{
    token: string;
    tokenMeta: TokenMeta;
    revokedTokenId: string;
  }>({
    method: 'POST',
    url: `${link.endpoint}/v1/cli/projects/${encodeURIComponent(link.projectId)}/tokens/rotate`,
    token,
    body: {
      tokenId,
      ...(name ? { name } : {}),
    },
  });

  await saveToken(link.endpoint, response.token);

  console.log(`Rotated token ${response.revokedTokenId} -> ${response.tokenMeta.id}`);
  console.log(`Token: ${response.token}`);
  console.log(`Saved rotated token for endpoint ${link.endpoint}`);
}

async function runTokenRevoke(args: string[]) {
  const tokenId = resolveOption(args, '--token-id');
  if (!tokenId) {
    throw {
      message: 'Missing --token-id. Usage: supersurkhet token revoke --token-id <id>',
      code: 1,
    } satisfies CliError;
  }

  const link = await resolveLink(
    resolveOption(args, '--project'),
    resolveOption(args, '--endpoint'),
  );
  const token = await resolveToken(link.endpoint, resolveOption(args, '--token'));

  const response = await requestJson<{
    revokedTokenId: string;
    revokedAt: string;
  }>({
    method: 'DELETE',
    url: `${link.endpoint}/v1/cli/projects/${encodeURIComponent(link.projectId)}/tokens/${encodeURIComponent(tokenId)}`,
    token,
  });

  console.log(`Revoked token ${response.revokedTokenId} at ${response.revokedAt}`);
}

async function runSyncUp(args: string[]) {
  const configPath = resolveOption(args, '--config') ?? DEFAULT_CONFIG_PATH;
  const plugin = await loadPluginConfig(configPath);

  const link = await resolveLink(resolveOption(args, '--project'), resolveOption(args, '--endpoint'));
  const token = await resolveToken(link.endpoint, resolveOption(args, '--token'));

  const result = await requestJson<{
    projectId: string;
    pluginId: string;
    revisionId: string;
    updatedAt: string;
    schemaCount: number;
  }>({
    method: 'PUT',
    url: `${link.endpoint}/v1/cli/projects/${encodeURIComponent(link.projectId)}/schemas`,
    token,
    body: {
      pluginId: plugin.pluginId,
      version: plugin.version,
      schemaDocs: plugin.schemaDocs ?? [],
    },
  });

  console.log(
    `Synced up ${result.schemaCount} schema(s) to remote project "${result.projectId}" for plugin "${result.pluginId}" (revision ${result.revisionId})`,
  );
}

async function runSyncDown(args: string[]) {
  const configPath = resolveOption(args, '--config') ?? DEFAULT_CONFIG_PATH;
  const outPath = resolveOption(args, '--out') ?? 'supersurkhet/schema.synced.json';
  const pluginOverride = resolveOption(args, '--plugin');

  const plugin = pluginOverride ? undefined : await loadPluginConfig(configPath);
  const pluginId = pluginOverride ?? plugin?.pluginId;
  if (!pluginId) {
    throw {
      message: 'Unable to determine pluginId. Provide --plugin <id> or --config <file>.',
      code: 1,
    } satisfies CliError;
  }

  const link = await resolveLink(resolveOption(args, '--project'), resolveOption(args, '--endpoint'));
  const token = await resolveToken(link.endpoint, resolveOption(args, '--token'));

  const response = await requestJson<SyncSnapshotResponse>({
    method: 'GET',
    url: `${link.endpoint}/v1/cli/projects/${encodeURIComponent(link.projectId)}/schemas?pluginId=${encodeURIComponent(pluginId)}`,
    token,
  });

  const absoluteOutPath = path.resolve(process.cwd(), outPath);
  await mkdir(path.dirname(absoluteOutPath), { recursive: true });
  await writeFile(
    absoluteOutPath,
    `${JSON.stringify(
      {
        projectId: response.projectId,
        pluginId: response.pluginId,
        revisionId: response.revisionId,
        updatedAt: response.updatedAt,
        schemaDocs: response.schemaDocs,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `Synced down ${response.schemaDocs.length} schema(s) from remote project "${response.projectId}" for plugin "${response.pluginId}" -> ${absoluteOutPath}`,
  );
}

async function resolveLink(projectOption?: string, endpointOption?: string): Promise<LinkConfig> {
  const absoluteLinkPath = path.resolve(process.cwd(), DEFAULT_LINK_PATH);
  const linked = await maybeReadJson<LinkConfig>(absoluteLinkPath);

  const projectId = projectOption ?? linked?.projectId;
  if (!projectId) {
    throw {
      message: `Missing project id. Run "supersurkhet link --project <id>" or provide --project.`,
      code: 1,
    } satisfies CliError;
  }

  const endpoint = normalizeEndpoint(endpointOption ?? linked?.endpoint ?? DEFAULT_ENDPOINT);
  return {
    projectId,
    endpoint,
    linkedAt: linked?.linkedAt ?? new Date().toISOString(),
  };
}

function normalizeEndpoint(raw: string): string {
  return raw.replace(/\/+$/, '');
}

async function resolveToken(endpoint: string, tokenOption?: string): Promise<string> {
  const fromOption = tokenOption?.trim();
  if (fromOption) return fromOption;

  const fromEnv = process.env.SUPERSURKHET_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const credentials = await readCredentials();
  const fromCredentials = credentials.endpoints[endpoint]?.token?.trim();
  if (fromCredentials) return fromCredentials;

  throw {
    message:
      `Missing API token. Provide --token, set SUPERSURKHET_TOKEN, or run link with --token once to save credentials.`,
    code: 1,
  } satisfies CliError;
}

async function saveToken(endpoint: string, token: string): Promise<void> {
  const credentials = await readCredentials();
  credentials.endpoints[endpoint] = {
    token,
    updatedAt: new Date().toISOString(),
  };

  await mkdir(path.dirname(CREDENTIALS_PATH), { recursive: true });
  await writeFile(CREDENTIALS_PATH, `${JSON.stringify(credentials, null, 2)}\n`);
}

async function readCredentials(): Promise<CredentialsFile> {
  const credentials = await maybeReadJson<CredentialsFile>(CREDENTIALS_PATH);
  if (!credentials || typeof credentials !== 'object') {
    return {
      version: 1,
      endpoints: {},
    };
  }

  return {
    version: 1,
    endpoints: credentials.endpoints ?? {},
  };
}

async function requestJson<T>(input: {
  method: 'GET' | 'PUT' | 'POST' | 'DELETE';
  url: string;
  token: string;
  body?: unknown;
}): Promise<T> {
  const response = await fetch(input.url, {
    method: input.method,
    headers: {
      Authorization: `Bearer ${input.token}`,
      ...(input.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!response.ok) {
    const message =
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof (parsed as { error?: unknown }).error === 'object' &&
      (parsed as { error: { message?: unknown } }).error?.message
        ? String((parsed as { error: { message: unknown } }).error.message)
        : `HTTP ${response.status} ${response.statusText}`;

    throw {
      message: `Remote request failed: ${message}`,
      code: 1,
    } satisfies CliError;
  }

  return parsed as T;
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

async function maybeReadJson<T>(filePath: string): Promise<T | undefined> {
  if (!existsSync(filePath)) {
    return undefined;
  }
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
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
