import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  ActionManifestDoc,
  SchemaDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';
import type { V3GateDiagnostic } from '@/lib/plugins/v3-gates';

export type PluginStudioV3TabsProps = {
  schemaDocs: readonly SchemaDoc[];
  workflows: readonly WorkflowDoc[];
  actionManifest: readonly ActionManifestDoc[];
  diagnostics: readonly V3GateDiagnostic[];
  jobCount: number;
  eventLogCount: number;
};

export function PluginStudioV3Tabs({
  schemaDocs,
  workflows,
  actionManifest,
  diagnostics,
  jobCount,
  eventLogCount,
}: PluginStudioV3TabsProps) {
  const errorCount = diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  ).length;
  const warningCount = diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'warning',
  ).length;

  return (
    <Card className="border-border/70 bg-card/90">
      <CardHeader>
        <CardTitle className="text-base">Plugin Studio V3 Workspace</CardTitle>
        <CardDescription>
          Modular V3 surfaces for trigger rules, action packages, diagnostics,
          and execution logs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trigger-rules">
          <TabsList>
            <TabsTrigger value="trigger-rules">Trigger Rules</TabsTrigger>
            <TabsTrigger value="action-package">
              Action Package Manager
            </TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
            <TabsTrigger value="execution-logs">
              Execution Logs/Replay
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trigger-rules" className="space-y-3">
            {workflows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No workflows configured.
              </p>
            ) : (
              workflows.map((workflow) => (
                <div
                  key={workflow.workflowId}
                  className="rounded-md border p-3"
                >
                  <p className="text-sm font-medium">{workflow.workflowId}</p>
                  <p className="text-xs text-muted-foreground">
                    {workflow.trigger?.table ?? workflow.table} •{' '}
                    {workflow.trigger?.event ?? workflow.hook}
                  </p>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="action-package" className="space-y-3">
            {actionManifest.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No actions configured.
              </p>
            ) : (
              actionManifest.map((action) => (
                <div
                  key={action.actionId}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{action.actionId}</p>
                    <p className="text-xs text-muted-foreground">
                      runtime: {action.runtime ?? 'missing'} • capabilities:{' '}
                      {(action.capabilities ?? []).length}
                    </p>
                  </div>
                  <Badge
                    variant={
                      action.runtime && (action.capabilities?.length ?? 0) > 0
                        ? 'default'
                        : 'destructive'
                    }
                  >
                    {action.runtime && (action.capabilities?.length ?? 0) > 0
                      ? 'Ready'
                      : 'Incomplete'}
                  </Badge>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant={errorCount > 0 ? 'destructive' : 'secondary'}>
                {errorCount} errors
              </Badge>
              <Badge variant="secondary">{warningCount} warnings</Badge>
              <Badge variant="outline">{schemaDocs.length} schemas</Badge>
              <Badge variant="outline">{workflows.length} workflows</Badge>
            </div>
            {diagnostics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No V3 gate diagnostics.
              </p>
            ) : (
              <div className="space-y-2">
                {diagnostics.map((diagnostic) => (
                  <div
                    key={`${diagnostic.code}:${diagnostic.path.join('.')}`}
                    className="rounded-md border p-3"
                  >
                    <p className="text-sm font-medium">{diagnostic.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {diagnostic.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      {diagnostic.path.join('.')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="execution-logs" className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline">{jobCount} jobs</Badge>
              <Badge variant="outline">{eventLogCount} log events</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Replay controls are scaffolded for V3 and will run against durable
              job/attempt entities.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled>
                Retry Job
              </Button>
              <Button type="button" variant="outline" size="sm" disabled>
                Resume From Node
              </Button>
              <Button type="button" variant="outline" size="sm" disabled>
                Cancel Workflow
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
