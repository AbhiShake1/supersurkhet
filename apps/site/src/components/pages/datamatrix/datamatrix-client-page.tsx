import {
  DataMatrixAgentConsole,
  type DataMatrixAgentConsoleProps,
} from '@/components/pages/datamatrix/datamatrix-agent-console';

export type DataMatrixClientPageProps = DataMatrixAgentConsoleProps;

export function DataMatrixClientPage({
  businessSlug,
  ...consoleProps
}: DataMatrixClientPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        <DataMatrixAgentConsole businessSlug={businessSlug} {...consoleProps} />
      </div>
    </div>
  );
}
