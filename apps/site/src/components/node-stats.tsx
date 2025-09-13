import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface NodeStatsProps {
  stats?: {
    started?: number;
    running?: number;
    completed?: number;
    error?: number;
    progress?: number;
  };
  className?: string;
}

export function NodeStats({ stats, className }: NodeStatsProps) {
  if (!stats) return null;

  const total = (stats.started || 0) + (stats.running || 0) + (stats.completed || 0) + (stats.error || 0);
  if (total === 0) return null;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs">
        <span>Progress</span>
        <span>{stats.progress !== undefined ? `${stats.progress}%` : `${stats.completed || 0}/${total}`}</span>
      </div>
      <Progress 
        value={stats.progress !== undefined ? stats.progress : ((stats.completed || 0) / total) * 100} 
        className="h-1.5"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{stats.started || 0} started</span>
        <span>{stats.running || 0} running</span>
        <span>{stats.completed || 0} completed</span>
        <span>{stats.error || 0} errors</span>
      </div>
    </div>
  );
}