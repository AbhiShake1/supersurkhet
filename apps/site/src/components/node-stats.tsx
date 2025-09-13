import { Badge } from "@/components/ui/badge";
import type { BaseNodeData } from "@/components/qr/visual-flow-builder";

export function NodeStats({ stats }: { stats?: BaseNodeData["stats"] }) {
  if (!stats) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {stats.started !== undefined && (
        <Badge variant="secondary" className="text-xs">
          Started: {stats.started}
        </Badge>
      )}
      {stats.running !== undefined && (
        <Badge variant="default" className="text-xs">
          Running: {stats.running}
        </Badge>
      )}
      {stats.completed !== undefined && (
        <Badge variant="outline" className="text-xs">
          Completed: {stats.completed}
        </Badge>
      )}
      {stats.error !== undefined && (
        <Badge variant="destructive" className="text-xs">
          Errors: {stats.error}
        </Badge>
      )}
    </div>
  );
}