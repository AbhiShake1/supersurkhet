import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  BadgePlus,
  Code2,
  PackageSearch,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import { buildPluginCatalog } from '@/lib/plugins/admin-plugin-catalog';
import {
  MARKETPLACE_SEED_RELEASES,
  parseReleaseId,
} from '@/lib/plugins/marketplace-seed';
import type {
  ActionManifestDoc,
  AdminTabDoc,
  PluginReleaseDoc,
  SchemaDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';
import {
  ensureMarketplaceSeedReleases,
  previewPluginReleaseHashes,
  publishPluginRelease,
} from '@/server-functions/plugins';
import { toast } from 'sonner';

export const Route = createFileRoute('/plugin-studio')({
  component: PluginStudioRoute,
});

const DEFAULT_SCHEMA_DOC = {
  schemaId: 'example.table',
  title: 'Example Table',
  fields: [
    {
      key: 'title',
      type: 'string',
      behavior: {
        fieldConfig: {
          fieldType: 'string',
          label: 'Title',
        },
      },
    },
  ],
} satisfies SchemaDoc;

const DEFAULT_WORKFLOW_DOC = {
  workflowId: 'example.workflow',
  table: 'example.table',
  hook: 'afterCreate',
  nodes: [
    {
      nodeId: 'n1',
      type: 'action',
      actionId: 'example.action',
      input: {
        expression: {
          kind: 'ref',
          source: 'payload',
          path: [],
        },
      },
    },
  ],
  edges: [],
} satisfies WorkflowDoc;

function canonicalStringify(input: unknown) {
  return JSON.stringify(input, null, 2);
}

function toLatestSeedReleases() {
  const map = new Map<string, (typeof MARKETPLACE_SEED_RELEASES)[number]>();
  for (const release of MARKETPLACE_SEED_RELEASES) {
    const existing = map.get(release.pluginId);
    if (!existing || release.version > existing.version) {
      map.set(release.pluginId, release);
    }
  }
  return [...map.values()].sort((left, right) =>
    left.pluginId.localeCompare(right.pluginId),
  );
}

type HashPreviewInput = {
  pluginId: string;
  version: string;
  docs: {
    title: string;
    description: string;
  };
  actionManifest: ActionManifestDoc[];
  schemaDocs: SchemaDoc[];
  workflows: WorkflowDoc[];
  adminTabs: AdminTabDoc[];
};

function PluginStudioRoute() {
  const { user, isAuthenticated } = useAuth();
  const actorUserId = user?.pub ?? 'anon';
  const [pluginId, setPluginId] = useState('example.plugin');
  const [version, setVersion] = useState('0.1.0');
  const [title, setTitle] = useState('Example Plugin');
  const [description, setDescription] = useState('Operational plugin release.');
  const [schemaText, setSchemaText] = useState(
    canonicalStringify([DEFAULT_SCHEMA_DOC]),
  );
  const [workflowText, setWorkflowText] = useState(
    canonicalStringify([DEFAULT_WORKFLOW_DOC]),
  );
  const [actionManifestText, setActionManifestText] = useState(
    canonicalStringify([]),
  );
  const [dslText, setDslText] = useState('');
  const [marketQuery, setMarketQuery] = useState('');
  const [debouncedHashInput, setDebouncedHashInput] =
    useState<HashPreviewInput | null>(null);
  const seededActorRef = useRef<string | null>(null);

  const {
    data: releaseRows = [],
    isLoading: isReleaseLoading,
    refetch: refetchReleases,
  } = api.pluginRelease.useGet();
  const releases = releaseRows as PluginReleaseDoc[];

  const parsed = useMemo(() => {
    try {
      const schemaDocs = JSON.parse(schemaText) as SchemaDoc[];
      const workflows = JSON.parse(workflowText) as WorkflowDoc[];
      const actionManifest = JSON.parse(actionManifestText) as ActionManifestDoc[];
      const adminTabs: AdminTabDoc[] = schemaDocs.map((doc) => ({
        schema: doc.schemaId,
        title: doc.title,
      }));
      return {
        schemaDocs,
        workflows,
        actionManifest,
        adminTabs,
      };
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return null;
    }
  }, [schemaText, workflowText, actionManifestText]);

  const isValidInputs = useMemo(() => {
    return pluginId.trim() &&
      version.trim() &&
      /^[a-z0-9][a-z0-9_.-]*[a-z0-9]$/.test(pluginId) &&
      /^\d+\.\d+\.\d+$/.test(version) &&
      parsed;
  }, [pluginId, version, parsed]);

  const { mutate: seedMarketplace } = useMutation({
    mutationKey: ['plugin-studio', 'seed-marketplace'],
    mutationFn: async (nextActorUserId: string) =>
      ensureMarketplaceSeedReleases({
        data: {
          actorUserId: nextActorUserId,
        },
      }),
    onSuccess: () => {
      void refetchReleases();
    },
    onError: (error) => {
      console.error(error);
      toast.error('Marketplace template sync failed.');
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    if (seededActorRef.current === actorUserId) {
      return;
    }
    seededActorRef.current = actorUserId;
    seedMarketplace(actorUserId);
  }, [actorUserId, isAuthenticated, seedMarketplace, user]);

  useEffect(() => {
    if (!parsed) {
      setDebouncedHashInput(null);
      return;
    }

    const timeout = setTimeout(() => {
      setDebouncedHashInput({
        pluginId,
        version,
        docs: {
          title,
          description,
        },
        actionManifest: parsed.actionManifest,
        schemaDocs: parsed.schemaDocs,
        workflows: parsed.workflows,
        adminTabs: parsed.adminTabs,
      });
    }, 250);

    return () => {
      clearTimeout(timeout);
    };
  }, [parsed, pluginId, version, title, description]);

  const hashPreviewQuery = useQuery({
    queryKey: ['plugin-studio', 'release-hash-preview', debouncedHashInput],
    enabled: debouncedHashInput !== null,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      if (!debouncedHashInput) {
        throw new Error('Missing release hash preview payload');
      }
      return previewPluginReleaseHashes({
        data: debouncedHashInput,
      });
    },
  });

  const { mutateAsync: publishRelease, isPending: isPublishing } = useMutation({
    mutationKey: ['plugin-studio', 'publish-release'],
    mutationFn: async () => {
      if (!parsed) {
        throw new Error('Invalid plugin payload');
      }
      return publishPluginRelease({
        data: {
          actorUserId,
          pluginId,
          version,
          docs: {
            title,
            description,
          },
          actionManifest: parsed.actionManifest,
          schemaDocs: parsed.schemaDocs,
          workflows: parsed.workflows,
          adminTabs: parsed.adminTabs,
        },
      });
    },
    onSuccess: async () => {
      await refetchReleases();
      toast.success(`Published ${pluginId}@${version}`);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Publish failed');
    },
  });

  const catalog = useMemo(
    () =>
      buildPluginCatalog({
        releases,
        installs: [],
        query: marketQuery,
        filter: 'all',
        sort: 'recent',
      }),
    [releases, marketQuery],
  );

  const templates = useMemo(() => toLatestSeedReleases(), []);
  const isInitialLoading = isReleaseLoading && releases.length === 0;

  function loadTemplate(releaseId: string) {
    // Handle both formats: "pluginId@version" and parsed object
    let parsedReleaseId = parseReleaseId(releaseId);

    // If parseReleaseId fails, try manual parsing
    if (!parsedReleaseId) {
      const parts = releaseId.split('@');
      if (parts.length === 2) {
        parsedReleaseId = { pluginId: parts[0], version: parts[1] };
      }
    }

    if (!parsedReleaseId) {
      console.error("Failed to parse release ID:", releaseId);
      return;
    }

    const template = MARKETPLACE_SEED_RELEASES.find(
      (release) =>
        release.pluginId === parsedReleaseId!.pluginId &&
        release.version === parsedReleaseId!.version,
    );

    if (!template) {
      console.error("Template not found for:", parsedReleaseId);
      return;
    }

    setPluginId(template.pluginId);
    setVersion(template.version);
    setTitle(template.docs.title);
    setDescription(template.docs.description);
    setActionManifestText(canonicalStringify(template.actionManifest));
    setSchemaText(canonicalStringify(template.schemaDocs));
    setWorkflowText(canonicalStringify(template.workflows));
    setDslText(
      `plugin ${template.pluginId}@${template.version}\n` +
      `recommendedFor ${template.recommendedFor.join(', ')}`,
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Plugin Studio</CardTitle>
          </CardHeader>
          <CardContent>Sign in to access the plugin studio.</CardContent>
        </Card>
      </div>
    );
  }

  if (isInitialLoading) return <PluginStudioSkeleton />;

  return (
    <TooltipProvider>
      <div className="flex justify-center w-full py-6">
        <div className="w-full max-w-7xl px-4 space-y-6">
          <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-cyan-50/70 via-background to-amber-50/70 p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium">
                  <Sparkles className="size-3.5" />
                  Plugin Studio
                </div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  Design, validate, and publish plugin releases faster.
                </h1>
                <p className="text-sm text-muted-foreground">
                  Create and publish plugins for the marketplace. Define schemas, workflows, and actions.
                </p>
              </div>
              <div className="rounded-xl border bg-background/70 p-3 text-sm">
                <div className="text-muted-foreground">Marketplace plugins</div>
                <div className="text-2xl font-semibold">{catalog.length}</div>
              </div>
            </div>
          </section>

          <Card className="py-4 gap-4">
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="text-base">Starter Templates</CardTitle>
              <CardDescription>
                Load a starter plugin profile, then customize docs, schema, and
                workflows before publishing.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-4 md:px-6 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => (
                <div key={`${template.pluginId}@${template.version}`} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{template.docs.title}</div>
                      <div className="text-xs text-muted-foreground">{template.pluginId}</div>
                    </div>
                    <Badge variant="outline">{template.version}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{template.docs.description}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      loadTemplate(`${template.pluginId}@${template.version}`)
                    }
                  >
                    <BadgePlus className="mr-2 size-4" />
                    Load Template
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Release Metadata</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        value={pluginId}
                        onChange={(event) => setPluginId(event.target.value)}
                        placeholder="pluginId"
                        className={!pluginId.trim() || !/^[a-z0-9][a-z0-9_.-]*[a-z0-9]$/.test(pluginId) ? 'border-red-500' : ''}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Unique identifier for your plugin (e.g., myorg.my-plugin)</p>
                    </TooltipContent>
                  </Tooltip>
                  {!pluginId.trim() && <p className="text-xs text-red-500">Plugin ID is required</p>}
                  {pluginId.trim() && !/^[a-z0-9][a-z0-9_.-]*[a-z0-9]$/.test(pluginId) && <p className="text-xs text-red-500">Invalid format (lowercase letters, numbers, dots, hyphens, underscores)</p>}
                </div>
                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        value={version}
                        onChange={(event) => setVersion(event.target.value)}
                        placeholder="version"
                        className={!version.trim() || !/^\d+\.\d+\.\d+$/.test(version) ? 'border-red-500' : ''}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Semantic version (e.g., 1.0.0)</p>
                    </TooltipContent>
                  </Tooltip>
                  {!version.trim() && <p className="text-xs text-red-500">Version is required</p>}
                  {version.trim() && !/^\d+\.\d+\.\d+$/.test(version) && <p className="text-xs text-red-500">Invalid format (x.y.z)</p>}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Plugin title"
                      className="md:col-span-2"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Human-readable title for your plugin</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Plugin description"
                      className="md:col-span-2"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Brief description of what your plugin does</p>
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Marketplace Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  leadingIcon={<PackageSearch className="size-4" />}
                  value={marketQuery}
                  onChange={(event) => setMarketQuery(event.target.value)}
                  placeholder="Search published plugins"
                  className="pl-9"
                />
                <div className="max-h-[220px] overflow-auto space-y-2 pr-1">
                  {catalog.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      <PackageSearch className="mr-2 inline size-4" />
                      No releases match your query.
                    </div>
                  ) : (
                    catalog.map((entry) => (
                      <div key={entry.pluginId} className="rounded-lg border p-3">
                        <div className="font-medium text-sm">{entry.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.pluginId}@{entry.latestRelease.version}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Schema Docs</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-xs bg-gray-100 rounded-full h-5 w-5 flex items-center justify-center">?</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Define the data structures for your plugin (tables, fields, relationships)</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="json" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="json">JSON Editor</TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit the raw JSON representation</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="visual">Visual Builder</TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Build using a visual interface (coming soon)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TabsList>
                  <TabsContent value="json">
                    <textarea
                      className="w-full min-h-[320px] font-mono text-xs rounded border p-3"
                      value={schemaText}
                      onChange={(event) => setSchemaText(event.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="visual">
                    <div className="p-4 border rounded-md min-h-[320px] bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-4">Visual schema builder coming soon...</p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Schema ID</label>
                          <Input placeholder="e.g., myorg.users" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Title</label>
                          <Input placeholder="e.g., User Data" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Fields</label>
                          <div className="space-y-2 mt-2">
                            <div className="flex gap-2">
                              <Input placeholder="Field Key" className="flex-1" />
                              <select className="border rounded px-2">
                                <option>string</option>
                                <option>number</option>
                                <option>boolean</option>
                                <option>object</option>
                              </select>
                            </div>
                            <Button size="sm" variant="outline">+ Add Field</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Workflows</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-xs bg-gray-100 rounded-full h-5 w-5 flex items-center justify-center">?</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Define automated processes that trigger based on events (create, update, delete)</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="json" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="json">JSON Editor</TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit the raw JSON representation</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="visual">Visual Builder</TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Build using a visual interface (coming soon)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TabsList>
                  <TabsContent value="json">
                    <textarea
                      className="w-full min-h-[320px] font-mono text-xs rounded border p-3"
                      value={workflowText}
                      onChange={(event) => setWorkflowText(event.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="visual">
                    <div className="p-4 border rounded-md min-h-[320px] bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-4">Visual workflow builder coming soon...</p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Workflow ID</label>
                          <Input placeholder="e.g., myorg.user-created" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Table</label>
                          <Input placeholder="e.g., myorg.users" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Hook</label>
                          <select className="w-full border rounded px-2">
                            <option>beforeCreate</option>
                            <option>afterCreate</option>
                            <option>beforeUpdate</option>
                            <option>afterUpdate</option>
                            <option>beforeDelete</option>
                            <option>afterDelete</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Action Manifest</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-xs bg-gray-100 rounded-full h-5 w-5 flex items-center justify-center">?</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Define custom actions that can be triggered by workflows or users</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="json" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="json">JSON Editor</TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit the raw JSON representation</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="visual">Visual Builder</TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Build using a visual interface (coming soon)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TabsList>
                  <TabsContent value="json">
                    <textarea
                      className="w-full min-h-[320px] font-mono text-xs rounded border p-3"
                      value={actionManifestText}
                      onChange={(event) => setActionManifestText(event.target.value)}
                    />
                  </TabsContent>
                  <TabsContent value="visual">
                    <div className="p-4 border rounded-md min-h-[320px] bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-4">Visual action builder coming soon...</p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Action ID</label>
                          <Input placeholder="e.g., myorg.send-email" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Title</label>
                          <Input placeholder="e.g., Send Welcome Email" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <Input placeholder="e.g., Sends a welcome email to new users" />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Publish Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!parsed && (
                <p className="text-sm text-destructive">
                  Invalid JSON in schema/workflow/action manifest editors.
                </p>
              )}
              {parsed && (
                <>
                  <p className="text-sm">
                    manifest hash:{' '}
                    <code>
                      {hashPreviewQuery.data?.manifestHash ??
                        (hashPreviewQuery.isPending ? 'calculating...' : 'unavailable')}
                    </code>
                  </p>
                  <p className="text-sm">
                    artifact hash:{' '}
                    <code>
                      {hashPreviewQuery.data?.artifactHash ??
                        (hashPreviewQuery.isPending ? 'calculating...' : 'unavailable')}
                    </code>
                  </p>
                </>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!parsed) return;
                    setDslText(
                      `plugin ${pluginId}@${version}\n` +
                      `schemaDocs ${parsed.schemaDocs.length}\n` +
                      `workflows ${parsed.workflows.length}\n` +
                      `actions ${parsed.actionManifest.length}`,
                    );
                  }}
                >
                  <Code2 className="mr-2 size-4" />
                  Generate Canonical DSL Preview
                </Button>
                <Button
                  disabled={!isValidInputs || isPublishing}
                  onClick={() => {
                    if (!isValidInputs) return;
                    void publishRelease();
                  }}
                >
                  {isPublishing ? (
                    'Publishing...'
                  ) : (
                    <>
                      Publish Immutable Release
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </div>
              <textarea
                className="w-full min-h-[120px] font-mono text-xs rounded border p-3"
                value={dslText}
                onChange={(event) => setDslText(event.target.value)}
                placeholder="Optional textual DSL preview"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

function PluginStudioSkeleton() {
  return (
    <div className="container py-6 space-y-6">
      <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-cyan-50/70 via-background to-amber-50/70 p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl w-full">
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="h-8 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="rounded-xl border bg-background/70 p-3 text-sm w-[180px] space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-12" />
          </div>
        </div>
      </section>

      <Card className="py-4 gap-4">
        <CardHeader className="px-4 md:px-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="grid gap-3 px-4 md:px-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`template-skeleton-${index}`}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-10 w-full md:col-span-2" />
            <Skeleton className="h-10 w-full md:col-span-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={`market-skeleton-${index}`}
                  className="h-14 w-full rounded-lg"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`editor-skeleton-${index}`}>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-[320px] w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-64" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-52" />
          </div>
          <Skeleton className="h-[120px] w-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
