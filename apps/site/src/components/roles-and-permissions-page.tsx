import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { generatePermissions } from '@/lib/permissions/generate-permissions';
import type { PossibleTabConfig } from './auto-admin';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface RolesMatrixProps {
  slug?: string;
  tabs: PossibleTabConfig[];
}

export function RolesAndPermissionsPage({ tabs }: RolesMatrixProps) {
  const groupedPermissions = useMemo(() => {
    return generatePermissions(tabs);
  }, [tabs]);

  return (
    <Card className="w-64 items-center justify-center">
      <CardContent className="p-0 space-y-6">
        <div className="space-y-2">
          {Object.entries(groupedPermissions).map(([feature, actions]) => (
            <PermissionGroup
              key={`${feature}:${actions.join('|')}`}
              feature={feature}
              actions={actions}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface PermissionGroupProps {
  feature: string;
  actions: string[];
}

const buildInitialCheckedStates = (feature: string, actions: string[]) => {
  const initialStates: Record<string, boolean> = {};
  for (const action of actions) {
    initialStates[`${feature}:${action}`] = false;
  }
  return initialStates;
};

function PermissionGroup({ feature, actions }: PermissionGroupProps) {
  const [expanded, setExpanded] = useState(true);

  const [checkedStates, setCheckedStates] = useState<Record<string, boolean>>(
    () => buildInitialCheckedStates(feature, actions),
  );

  const isFeatureFullyChecked = actions.every(
    (action) => checkedStates[`${feature}:${action}`],
  );

  const isFeaturePartiallyChecked = () => {
    const checkedCount = actions.filter(
      (action) => checkedStates[`${feature}:${action}`],
    ).length;
    return checkedCount > 0 && checkedCount < actions.length;
  };

  const handleFeatureChange = (checked: boolean) => {
    const newCheckedStates = { ...checkedStates };
    for (const action of actions) {
      newCheckedStates[`${feature}:${action}`] = checked;
    }
    setCheckedStates(newCheckedStates);
  };

  const handlePermissionChange = (action: string, checked: boolean) => {
    setCheckedStates((prev) => ({
      ...prev,
      [`${feature}:${action}`]: checked,
    }));
  };

  return (
    <div className="space-y-1">
      {/** biome-ignore lint/a11y/noStaticElementInteractions: lint debt cleanup */}
      {/** biome-ignore lint/a11y/useKeyWithClickEvents: lint debt cleanup */}
      <div
        className="flex items-center space-x-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Checkbox
          id={`feature-${feature}`}
          checked={
            isFeatureFullyChecked
              ? true
              : isFeaturePartiallyChecked()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(checked) => handleFeatureChange(checked as boolean)}
        />
        <Label
          htmlFor={`feature-${feature}`}
          className="text-sm font-medium capitalize"
        >
          {feature}
        </Label>
      </div>

      {expanded && (
        <div className="ml-6 space-y-1 pl-2 border-l border-border">
          {actions.map((action) => (
            <div
              key={`${feature}:${action}`}
              className="flex items-center space-x-2 py-1"
            >
              <Checkbox
                id={`${feature}-${action}`}
                checked={checkedStates[`${feature}:${action}`] || false}
                onCheckedChange={(checked) =>
                  handlePermissionChange(action, checked as boolean)
                }
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label
                    htmlFor={`${feature}-${action}`}
                    className="text-sm capitalize"
                  >
                    {action.replaceAll('_', ' ')}
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{`Can ${action.replaceAll('_', ' ')} ${feature.replaceAll('_', ' ')}`}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
