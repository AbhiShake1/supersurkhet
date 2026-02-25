import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get as ssrGet } from '@/lib/gun/ssr/get';
import { update as ssrUpdate } from '@/lib/gun/ssr/update';
import {
  handleCliProjectRequest,
  handleCliProjectSchemasRequest,
  handleCliProjectTokenByIdRequest,
  handleCliProjectTokenRotateRequest,
  handleCliProjectTokensRequest,
} from './cli-sync-api';

const inMemoryDb = vi.hoisted(() => {
  const tables = new Map<string, Map<string, Record<string, unknown>>>();
  const getTable = (name: string) => {
    const existing = tables.get(name);
    if (existing) return existing;
    const next = new Map<string, Record<string, unknown>>();
    tables.set(name, next);
    return next;
  };

  return {
    reset: () => tables.clear(),
    getAllRows: (tableName: string) => Array.from(getTable(tableName).values()),
    getRowById: (tableName: string, id: string) => getTable(tableName).get(id),
    putRow: (tableName: string, row: Record<string, unknown>) => {
      const id = String(row.id);
      getTable(tableName).set(id, { ...row });
    },
  };
});

vi.mock('@/lib/gun/ssr/get', () => ({
  get: vi.fn(
    async (
      keyOrOptions: string | { key: string; single?: boolean },
      id?: string,
    ) => {
      const tableName =
        typeof keyOrOptions === 'string' ? keyOrOptions : keyOrOptions.key;
      if (typeof keyOrOptions === 'string') {
        return inMemoryDb.getAllRows(tableName);
      }

      if (keyOrOptions.single) {
        const row = inMemoryDb.getRowById(tableName, String(id));
        return row ? [row] : [];
      }

      return inMemoryDb.getAllRows(tableName);
    },
  ),
}));

vi.mock('@/lib/gun/ssr/update', () => ({
  update: vi.fn((tableName: string) => async (row: Record<string, unknown>) => {
    inMemoryDb.putRow(tableName, row);
    return { ok: 1 };
  }),
}));

vi.mock('@/lib/gun/ssr/create', () => ({
  create: vi.fn((tableName: string) => async (row: Record<string, unknown>) => {
    inMemoryDb.putRow(tableName, row);
    return { ok: 1 };
  }),
}));

function createProjectId(seed: string) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  return `proj-${seed}-${suffix}`;
}

async function upsertProject(projectId: string, ownerUserId: string) {
  const now = new Date().toISOString();
  await ssrUpdate('pluginProject')({
    id: projectId,
    name: `Project ${projectId}`,
    ownerUserId,
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
  });
}

async function upsertProjectMember(
  projectId: string,
  userId: string,
  role: 'owner' | 'admin' | 'editor' | 'viewer',
) {
  await ssrUpdate('pluginProjectMember')({
    id: `${projectId}::${userId}`,
    projectId,
    userId,
    role,
    joinedAt: new Date().toISOString(),
  });
}

function appHeaders(actorUserId: string): HeadersInit {
  const sessionCookie = encodeURIComponent(
    JSON.stringify({
      pub: actorUserId,
    }),
  );
  return {
    cookie: `gun-user=${sessionCookie}`,
    'content-type': 'application/json',
  };
}

describe('cli sync api', () => {
  beforeEach(() => {
    inMemoryDb.reset();
  });

  it('issues, rotates, and revokes user-scoped project token', async () => {
    const projectId = createProjectId('token');
    const actorUserId = `user-${projectId}`;
    await upsertProject(projectId, actorUserId);

    const issueResponse = await handleCliProjectTokensRequest(
      new Request(`http://localhost/v1/cli/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: appHeaders(actorUserId),
        body: JSON.stringify({ name: 'local-dev' }),
      }),
    );
    expect(issueResponse.status).toBe(200);
    const issued = (await issueResponse.json()) as {
      token: string;
      tokenMeta: { id: string; userId: string; projectId: string };
    };
    expect(issued.token.startsWith('ssk_')).toBe(true);
    expect(issued.tokenMeta.projectId).toBe(projectId);
    expect(issued.tokenMeta.userId).toBe(actorUserId);

    const projectWithIssuedToken = await handleCliProjectRequest(
      new Request(`http://localhost/v1/cli/projects/${projectId}`, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${issued.token}`,
        },
      }),
    );
    expect(projectWithIssuedToken.status).toBe(200);

    const rotateResponse = await handleCliProjectTokenRotateRequest(
      new Request(
        `http://localhost/v1/cli/projects/${projectId}/tokens/rotate`,
        {
          method: 'POST',
          headers: appHeaders(actorUserId),
          body: JSON.stringify({
            tokenId: issued.tokenMeta.id,
            name: 'rotated',
          }),
        },
      ),
    );
    expect(rotateResponse.status).toBe(200);
    const rotated = (await rotateResponse.json()) as {
      token: string;
      tokenMeta: { id: string };
      revokedTokenId: string;
    };
    expect(rotated.revokedTokenId).toBe(issued.tokenMeta.id);
    expect(rotated.tokenMeta.id).not.toBe(issued.tokenMeta.id);

    const oldTokenResponse = await handleCliProjectRequest(
      new Request(`http://localhost/v1/cli/projects/${projectId}`, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${issued.token}`,
        },
      }),
    );
    expect(oldTokenResponse.status).toBe(403);

    const revokeResponse = await handleCliProjectTokenByIdRequest(
      new Request(
        `http://localhost/v1/cli/projects/${projectId}/tokens/${encodeURIComponent(rotated.tokenMeta.id)}`,
        {
          method: 'DELETE',
          headers: appHeaders(actorUserId),
        },
      ),
    );
    expect(revokeResponse.status).toBe(200);

    const revokedTokenResponse = await handleCliProjectRequest(
      new Request(`http://localhost/v1/cli/projects/${projectId}`, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${rotated.token}`,
        },
      }),
    );
    expect(revokedTokenResponse.status).toBe(403);
  });

  it('stores and reads schema snapshots from dedicated cliSchemaSnapshot table', async () => {
    const projectId = createProjectId('snapshot');
    const actorUserId = `user-${projectId}`;
    await upsertProject(projectId, actorUserId);

    const issueResponse = await handleCliProjectTokensRequest(
      new Request(`http://localhost/v1/cli/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: appHeaders(actorUserId),
        body: JSON.stringify({ name: 'sync-token' }),
      }),
    );
    const issued = (await issueResponse.json()) as { token: string };

    const syncUpResponse = await handleCliProjectSchemasRequest(
      new Request(`http://localhost/v1/cli/projects/${projectId}/schemas`, {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${issued.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          pluginId: 'inventory.plugin',
          version: '0.0.1',
          schemaDocs: [
            {
              schemaId: 'product',
              fields: [{ key: 'name', type: 'string' }],
            },
          ],
        }),
      }),
    );
    expect(syncUpResponse.status).toBe(200);

    const syncDownResponse = await handleCliProjectSchemasRequest(
      new Request(
        `http://localhost/v1/cli/projects/${projectId}/schemas?pluginId=inventory.plugin`,
        {
          method: 'GET',
          headers: {
            authorization: `Bearer ${issued.token}`,
          },
        },
      ),
    );
    expect(syncDownResponse.status).toBe(200);
    const snapshot = (await syncDownResponse.json()) as {
      projectId: string;
      pluginId: string;
      schemaDocs: Array<{ schemaId: string }>;
    };
    expect(snapshot.projectId).toBe(projectId);
    expect(snapshot.pluginId).toBe('inventory.plugin');
    expect(snapshot.schemaDocs[0]?.schemaId).toBe('product');

    const snapshotRowId = `cli-snapshot::${projectId.replace(/[^A-Za-z0-9._:-]/g, '_')}::inventory.plugin`;
    const [snapshotRow] = await ssrGet(
      { key: 'cliSchemaSnapshot', single: true },
      snapshotRowId,
    );
    expect(snapshotRow).toBeTruthy();
  });

  it('prevents rotating or revoking another user token', async () => {
    const projectId = createProjectId('scope');
    const ownerUserId = `owner-${projectId}`;
    const adminUserId = `admin-${projectId}`;
    await upsertProject(projectId, ownerUserId);
    await upsertProjectMember(projectId, adminUserId, 'admin');

    const issueResponse = await handleCliProjectTokensRequest(
      new Request(`http://localhost/v1/cli/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: appHeaders(ownerUserId),
        body: JSON.stringify({ name: 'owner-token' }),
      }),
    );
    expect(issueResponse.status).toBe(200);
    const issued = (await issueResponse.json()) as {
      tokenMeta: { id: string };
    };

    const rotateAsAdmin = await handleCliProjectTokenRotateRequest(
      new Request(
        `http://localhost/v1/cli/projects/${projectId}/tokens/rotate`,
        {
          method: 'POST',
          headers: appHeaders(adminUserId),
          body: JSON.stringify({ tokenId: issued.tokenMeta.id }),
        },
      ),
    );
    expect(rotateAsAdmin.status).toBe(403);

    const revokeAsAdmin = await handleCliProjectTokenByIdRequest(
      new Request(
        `http://localhost/v1/cli/projects/${projectId}/tokens/${encodeURIComponent(issued.tokenMeta.id)}`,
        {
          method: 'DELETE',
          headers: appHeaders(adminUserId),
        },
      ),
    );
    expect(revokeAsAdmin.status).toBe(403);
  });

  it('allows token management via bearer auth for CLI usage', async () => {
    const projectId = createProjectId('bearer');
    const actorUserId = `owner-${projectId}`;
    await upsertProject(projectId, actorUserId);

    const seedIssueResponse = await handleCliProjectTokensRequest(
      new Request(`http://localhost/v1/cli/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: appHeaders(actorUserId),
        body: JSON.stringify({ name: 'seed' }),
      }),
    );
    expect(seedIssueResponse.status).toBe(200);
    const seeded = (await seedIssueResponse.json()) as {
      token: string;
      tokenMeta: { id: string; userId: string };
    };

    const listViaBearerResponse = await handleCliProjectTokensRequest(
      new Request(`http://localhost/v1/cli/projects/${projectId}/tokens`, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${seeded.token}`,
        },
      }),
    );
    expect(listViaBearerResponse.status).toBe(200);
    const listed = (await listViaBearerResponse.json()) as {
      tokens: Array<{ id: string; userId: string }>;
    };
    expect(listed.tokens.length).toBe(1);
    expect(listed.tokens[0]?.id).toBe(seeded.tokenMeta.id);
    expect(listed.tokens[0]?.userId).toBe(actorUserId);

    const issueViaBearerResponse = await handleCliProjectTokensRequest(
      new Request(`http://localhost/v1/cli/projects/${projectId}/tokens`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${seeded.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'cli-issued' }),
      }),
    );
    expect(issueViaBearerResponse.status).toBe(200);
    const issuedViaBearer = (await issueViaBearerResponse.json()) as {
      token: string;
      tokenMeta: { id: string; userId: string };
    };
    expect(issuedViaBearer.tokenMeta.userId).toBe(actorUserId);

    const rotateViaBearerResponse = await handleCliProjectTokenRotateRequest(
      new Request(
        `http://localhost/v1/cli/projects/${projectId}/tokens/rotate`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${issuedViaBearer.token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ tokenId: issuedViaBearer.tokenMeta.id }),
        },
      ),
    );
    expect(rotateViaBearerResponse.status).toBe(200);
  });
});
