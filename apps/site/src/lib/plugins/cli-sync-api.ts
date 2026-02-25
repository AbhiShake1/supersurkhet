import { createHash, randomBytes } from 'node:crypto';
import type { SchemaDoc } from '@supersurkhet/sdk';
import { z } from 'zod';
import { create as ssrCreate } from '@/lib/gun/ssr/create';
import { get as ssrGet } from '@/lib/gun/ssr/get';
import { update as ssrUpdate } from '@/lib/gun/ssr/update';

type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer';

type CliTokenRow = {
  id: string;
  projectId: string;
  userId: string;
  name?: string;
  tokenHash: string;
  tokenPrefix: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
  rotatedFromTokenId?: string;
};

type CliSchemaSnapshotRow = {
  id: string;
  projectId: string;
  pluginId: string;
  revisionId: string;
  schemaDocs: SchemaDoc[];
  updatedAt: string;
  updatedByUserId: string;
};

const putSchema = z.object({
  pluginId: z.string().trim().min(1),
  version: z.string().trim().optional(),
  schemaDocs: z.array(z.any() as z.ZodType<SchemaDoc>),
});

const issueTokenSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

const rotateTokenSchema = z.object({
  tokenId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120).optional(),
});

function jsonResponse(
  data: unknown,
  init: {
    status?: number;
    headers?: HeadersInit;
  } = {},
): Response {
  return Response.json(data, {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

function errorResponse(status: number, message: string): Response {
  return jsonResponse(
    {
      error: {
        message,
      },
    },
    { status },
  );
}

async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema> | null> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function parseCookieHeader(
  cookieHeader: string | null,
): Record<string, string> {
  const parsed: Record<string, string> = {};
  if (!cookieHeader) return parsed;

  for (const chunk of cookieHeader.split(';')) {
    const trimmed = chunk.trim();
    if (trimmed.length === 0) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    parsed[key] = decodeURIComponent(value);
  }

  return parsed;
}

function hasAppAuthCookie(request: Request): boolean {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  return (
    typeof cookies['gun-user'] === 'string' && cookies['gun-user'].length > 0
  );
}

function extractBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get('authorization');
  if (!authorization) return undefined;
  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token) return undefined;
  if (scheme.toLowerCase() !== 'bearer') return undefined;
  const normalized = token.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveActorUserIdFromSession(request: Request): string | undefined {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const rawSessionUser = cookies['gun-user']?.trim();
  if (!rawSessionUser) return undefined;

  try {
    const parsed = JSON.parse(rawSessionUser) as {
      pub?: unknown;
      _?: { soul?: unknown };
      id?: unknown;
      userId?: unknown;
    };

    const aliases = [
      parsed.pub,
      parsed._?.soul,
      parsed.id,
      parsed.userId,
    ].filter((value): value is string => typeof value === 'string');

    return aliases.find((value) => value.trim().length > 0)?.trim();
  } catch {
    return undefined;
  }
}

function parseProjectIdFromPath(request: Request): string | null {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const projectsIndex = segments.indexOf('projects');
  const projectId =
    projectsIndex >= 0 ? segments[projectsIndex + 1] : undefined;
  return projectId ? decodeURIComponent(projectId) : null;
}

function parseTokenIdFromPath(request: Request): string | null {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const tokensIndex = segments.indexOf('tokens');
  const tokenId = tokensIndex >= 0 ? segments[tokensIndex + 1] : undefined;
  if (!tokenId || tokenId === 'rotate') return null;
  return decodeURIComponent(tokenId);
}

function createTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createTokenRowIdFromHash(tokenHash: string): string {
  return `cli-token::${tokenHash}`;
}

function createSchemaSnapshotRowId(
  projectId: string,
  pluginId: string,
): string {
  const normalize = (value: string) =>
    value.trim().replace(/[^A-Za-z0-9._:-]/g, '_');
  return `cli-snapshot::${normalize(projectId)}::${normalize(pluginId)}`;
}

function createPlainCliToken(): string {
  const random = randomBytes(24).toString('base64url');
  return `ssk_${random}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function readProject(projectId: string) {
  const [project] = await ssrGet(
    { key: 'pluginProject', single: true },
    projectId,
  );
  return project as
    | {
        id?: string;
        name?: string;
        ownerUserId?: string;
        visibility?: string;
        updatedAt?: string;
      }
    | undefined;
}

async function resolveProjectRole(
  projectId: string,
  actorUserId: string,
): Promise<ProjectRole | null> {
  const project = await readProject(projectId);
  if (!project) return null;

  if (project.ownerUserId === actorUserId) {
    return 'owner';
  }

  const memberRowId = `${projectId}::${actorUserId}`;
  const [member] = await ssrGet(
    { key: 'pluginProjectMember', single: true },
    memberRowId,
  );
  const role = (member as { role?: ProjectRole } | undefined)?.role;
  return role ?? null;
}

async function ensureActorCanManageProjectTokens(
  request: Request,
  projectId: string,
): Promise<
  | {
      ok: true;
      actorUserId: string;
      role: ProjectRole;
    }
  | {
      ok: false;
      response: Response;
    }
> {
  if (hasAppAuthCookie(request)) {
    const actorUserId = resolveActorUserIdFromSession(request);
    if (!actorUserId) {
      return {
        ok: false,
        response: errorResponse(401, 'Invalid app session user identity.'),
      };
    }

    const role = await resolveProjectRole(projectId, actorUserId);
    if (!role) {
      return {
        ok: false,
        response: errorResponse(403, 'Project access required.'),
      };
    }

    return {
      ok: true,
      actorUserId,
      role,
    };
  }

  const bearerAuth = await ensureCliBearerAuthForProject(request, projectId);
  if (!bearerAuth.ok) {
    return {
      ok: false,
      response: bearerAuth.response,
    };
  }

  const role = await resolveProjectRole(projectId, bearerAuth.tokenRow.userId);
  return {
    ok: true,
    actorUserId: bearerAuth.tokenRow.userId,
    role: role ?? 'viewer',
  };
}

async function readCliTokenById(
  tokenId: string,
): Promise<CliTokenRow | undefined> {
  const [row] = await ssrGet({ key: 'cliApiToken', single: true }, tokenId);
  return row as CliTokenRow | undefined;
}

async function readCliTokenByPlaintext(
  token: string,
): Promise<CliTokenRow | undefined> {
  const tokenHash = createTokenHash(token);
  const tokenId = createTokenRowIdFromHash(tokenHash);
  const row = await readCliTokenById(tokenId);
  if (!row) return undefined;
  if (row.tokenHash !== tokenHash) return undefined;
  return row;
}

async function ensureCliBearerAuthForProject(
  request: Request,
  projectId: string,
): Promise<
  | {
      ok: true;
      tokenRow: CliTokenRow;
    }
  | {
      ok: false;
      response: Response;
    }
> {
  const bearer = extractBearerToken(request);
  if (!bearer) {
    return {
      ok: false,
      response: errorResponse(401, 'Missing Bearer token.'),
    };
  }

  const tokenRow = await readCliTokenByPlaintext(bearer);
  if (!tokenRow) {
    return {
      ok: false,
      response: errorResponse(403, 'Invalid CLI API token.'),
    };
  }

  if (tokenRow.projectId !== projectId) {
    return {
      ok: false,
      response: errorResponse(403, 'Token is not scoped to this project.'),
    };
  }

  if (tokenRow.revokedAt) {
    return {
      ok: false,
      response: errorResponse(403, 'CLI API token is revoked.'),
    };
  }

  const now = nowIso();
  await ssrUpdate('cliApiToken')({
    ...tokenRow,
    lastUsedAt: now,
    updatedAt: now,
  });

  return {
    ok: true,
    tokenRow: {
      ...tokenRow,
      lastUsedAt: now,
      updatedAt: now,
    },
  };
}

async function issueCliToken(input: {
  projectId: string;
  actorUserId: string;
  name?: string;
  rotatedFromTokenId?: string;
}): Promise<{
  token: string;
  row: CliTokenRow;
}> {
  const token = createPlainCliToken();
  const tokenHash = createTokenHash(token);
  const tokenId = createTokenRowIdFromHash(tokenHash);
  const now = nowIso();

  const row: CliTokenRow = {
    id: tokenId,
    projectId: input.projectId,
    userId: input.actorUserId,
    name: input.name,
    tokenHash,
    tokenPrefix: token.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    rotatedFromTokenId: input.rotatedFromTokenId,
  };

  await ssrCreate('cliApiToken')({
    ...row,
  });

  return {
    token,
    row,
  };
}

function sanitizeTokenRow(row: CliTokenRow) {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
    rotatedFromTokenId: row.rotatedFromTokenId,
  };
}

export async function handleCliProjectRequest(
  request: Request,
): Promise<Response> {
  const projectId = parseProjectIdFromPath(request);
  if (!projectId) {
    return errorResponse(400, 'Missing project id in URL.');
  }

  const auth = await ensureCliBearerAuthForProject(request, projectId);
  if (!auth.ok) {
    return auth.response;
  }

  const project = await readProject(projectId);
  if (!project) {
    return errorResponse(404, `Project "${projectId}" not found.`);
  }

  return jsonResponse({
    project: {
      id: project.id ?? projectId,
      name: project.name ?? projectId,
      visibility: project.visibility ?? 'private',
      updatedAt: project.updatedAt,
    },
    token: {
      userId: auth.tokenRow.userId,
      tokenPrefix: auth.tokenRow.tokenPrefix,
      lastUsedAt: auth.tokenRow.lastUsedAt,
    },
  });
}

export async function handleCliProjectSchemasRequest(
  request: Request,
): Promise<Response> {
  const projectId = parseProjectIdFromPath(request);
  if (!projectId) {
    return errorResponse(400, 'Missing project id in URL.');
  }

  const project = await readProject(projectId);
  if (!project) {
    return errorResponse(404, `Project "${projectId}" not found.`);
  }

  const auth = await ensureCliBearerAuthForProject(request, projectId);
  if (!auth.ok) {
    return auth.response;
  }

  if (request.method === 'PUT') {
    const parsed = await parseJsonBody(request, putSchema);
    if (!parsed) {
      return errorResponse(400, 'Invalid payload.');
    }

    const now = nowIso();
    const rowId = createSchemaSnapshotRowId(projectId, parsed.pluginId);
    const revisionId = `rev.${Date.now()}`;
    const snapshot: CliSchemaSnapshotRow = {
      id: rowId,
      projectId,
      pluginId: parsed.pluginId,
      revisionId,
      schemaDocs: parsed.schemaDocs,
      updatedAt: now,
      updatedByUserId: auth.tokenRow.userId,
    };

    await ssrUpdate('cliSchemaSnapshot')({
      ...snapshot,
    });

    return jsonResponse({
      projectId,
      pluginId: snapshot.pluginId,
      revisionId: snapshot.revisionId,
      updatedAt: snapshot.updatedAt,
      schemaCount: snapshot.schemaDocs.length,
      updatedByUserId: snapshot.updatedByUserId,
    });
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const pluginId = url.searchParams.get('pluginId')?.trim();
    if (!pluginId) {
      return errorResponse(400, 'Missing query param: pluginId');
    }

    const rowId = createSchemaSnapshotRowId(projectId, pluginId);
    const [row] = await ssrGet(
      { key: 'cliSchemaSnapshot', single: true },
      rowId,
    );
    if (!row) {
      return errorResponse(
        404,
        `No remote schema snapshot found for plugin "${pluginId}".`,
      );
    }

    const snapshot = row as CliSchemaSnapshotRow;
    return jsonResponse({
      projectId: snapshot.projectId,
      pluginId: snapshot.pluginId,
      revisionId: snapshot.revisionId,
      updatedAt: snapshot.updatedAt,
      schemaDocs: snapshot.schemaDocs,
    });
  }

  return errorResponse(405, 'Method not allowed.');
}

export async function handleCliProjectTokensRequest(
  request: Request,
): Promise<Response> {
  const projectId = parseProjectIdFromPath(request);
  if (!projectId) {
    return errorResponse(400, 'Missing project id in URL.');
  }

  const project = await readProject(projectId);
  if (!project) {
    return errorResponse(404, `Project "${projectId}" not found.`);
  }

  const actor = await ensureActorCanManageProjectTokens(request, projectId);
  if (!actor.ok) {
    return actor.response;
  }

  if (request.method === 'POST') {
    const parsed = await parseJsonBody(request, issueTokenSchema);
    if (!parsed) {
      return errorResponse(400, 'Invalid token issue payload.');
    }

    const issued = await issueCliToken({
      projectId,
      actorUserId: actor.actorUserId,
      name: parsed.name,
    });

    return jsonResponse({
      token: issued.token,
      tokenMeta: sanitizeTokenRow(issued.row),
    });
  }

  if (request.method === 'GET') {
    const rows = (await ssrGet('cliApiToken')) as CliTokenRow[];
    const filtered = rows.filter(
      (row) => row.projectId === projectId && row.userId === actor.actorUserId,
    );

    return jsonResponse({
      tokens: filtered.map((row) => sanitizeTokenRow(row)),
    });
  }

  return errorResponse(405, 'Method not allowed.');
}

export async function handleCliProjectTokenRotateRequest(
  request: Request,
): Promise<Response> {
  const projectId = parseProjectIdFromPath(request);
  if (!projectId) {
    return errorResponse(400, 'Missing project id in URL.');
  }

  const project = await readProject(projectId);
  if (!project) {
    return errorResponse(404, `Project "${projectId}" not found.`);
  }

  const actor = await ensureActorCanManageProjectTokens(request, projectId);
  if (!actor.ok) {
    return actor.response;
  }

  if (request.method !== 'POST') {
    return errorResponse(405, 'Method not allowed.');
  }

  const parsed = await parseJsonBody(request, rotateTokenSchema);
  if (!parsed) {
    return errorResponse(400, 'Invalid token rotate payload.');
  }

  const tokenRow = await readCliTokenById(parsed.tokenId);
  if (!tokenRow || tokenRow.projectId !== projectId) {
    return errorResponse(404, 'Token not found for this project.');
  }
  if (tokenRow.userId !== actor.actorUserId) {
    return errorResponse(
      403,
      'Token does not belong to the authenticated user.',
    );
  }

  if (tokenRow.revokedAt) {
    return errorResponse(409, 'Token is already revoked.');
  }

  const now = nowIso();
  await ssrUpdate('cliApiToken')({
    ...tokenRow,
    revokedAt: now,
    updatedAt: now,
  });

  const issued = await issueCliToken({
    projectId,
    actorUserId: tokenRow.userId,
    name: parsed.name ?? tokenRow.name,
    rotatedFromTokenId: tokenRow.id,
  });

  return jsonResponse({
    token: issued.token,
    tokenMeta: sanitizeTokenRow(issued.row),
    revokedTokenId: tokenRow.id,
  });
}

export async function handleCliProjectTokenByIdRequest(
  request: Request,
): Promise<Response> {
  const projectId = parseProjectIdFromPath(request);
  if (!projectId) {
    return errorResponse(400, 'Missing project id in URL.');
  }

  const project = await readProject(projectId);
  if (!project) {
    return errorResponse(404, `Project "${projectId}" not found.`);
  }

  const actor = await ensureActorCanManageProjectTokens(request, projectId);
  if (!actor.ok) {
    return actor.response;
  }

  const tokenId = parseTokenIdFromPath(request);
  if (!tokenId) {
    return errorResponse(400, 'Missing token id in URL.');
  }

  if (request.method !== 'DELETE') {
    return errorResponse(405, 'Method not allowed.');
  }

  const tokenRow = await readCliTokenById(tokenId);
  if (!tokenRow || tokenRow.projectId !== projectId) {
    return errorResponse(404, 'Token not found for this project.');
  }
  if (tokenRow.userId !== actor.actorUserId) {
    return errorResponse(
      403,
      'Token does not belong to the authenticated user.',
    );
  }

  const now = nowIso();
  await ssrUpdate('cliApiToken')({
    ...tokenRow,
    revokedAt: tokenRow.revokedAt ?? now,
    updatedAt: now,
  });

  return jsonResponse({
    revokedTokenId: tokenRow.id,
    revokedAt: tokenRow.revokedAt ?? now,
  });
}
