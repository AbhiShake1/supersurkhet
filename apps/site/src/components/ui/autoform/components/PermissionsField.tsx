import type { AutoFormFieldProps } from "@autoform/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generatePermissions } from "@/lib/permissions/generate-permissions";
import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PermissionGroupProps {
  feature: string;
  actions: string[];
}

function PermissionGroup({ feature, actions, value = [], onChange }: PermissionGroupProps & { value?: string[], onChange?: (permissions: string[]) => void }) {
  const [expanded, setExpanded] = useState(true);

  const [checkedStates, setCheckedStates] = useState<Record<string, boolean>>({});

  // Initialize the checked states based on current value
  useEffect(() => {
    const initialStates: Record<string, boolean> = {};
    for (const action of actions) {
      const permissionKey = `${feature}:${action}`;
      initialStates[permissionKey] = value?.includes(permissionKey) || false;
    }
    setCheckedStates(initialStates);
  }, [feature, actions, value]);

  const isFeatureFullyChecked = actions.every(action =>
    checkedStates[`${feature}:${action}`]
  );

  const isFeaturePartiallyChecked = () => {
    const checkedCount = actions.filter(
      action => checkedStates[`${feature}:${action}`]
    ).length;
    return checkedCount > 0 && checkedCount < actions.length;
  };

  const handleFeatureChange = (checked: boolean) => {
    const newCheckedStates = { ...checkedStates };
    const newPermissions = [...(value || [])];

    for (const action of actions) {
      const permissionKey = `${feature}:${action}`;
      newCheckedStates[permissionKey] = checked;

      if (checked && !newPermissions.includes(permissionKey)) {
        newPermissions.push(permissionKey);
      } else if (!checked) {
        const index = newPermissions.indexOf(permissionKey);
        if (index > -1) {
          newPermissions.splice(index, 1);
        }
      }
    }

    setCheckedStates(newCheckedStates);
    onChange?.(newPermissions);
  };

  const handlePermissionChange = (action: string, checked: boolean) => {
    const permissionKey = `${feature}:${action}`;
    const newCheckedStates = {
      ...checkedStates,
      [permissionKey]: checked
    };

    const newPermissions = [...(value || [])];
    if (checked && !newPermissions.includes(permissionKey)) {
      newPermissions.push(permissionKey);
    } else if (!checked) {
      const index = newPermissions.indexOf(permissionKey);
      if (index > -1) {
        newPermissions.splice(index, 1);
      }
    }

    setCheckedStates(newCheckedStates);
    onChange?.(newPermissions);
  };

  return (
    <div className="space-y-1">
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
          checked={isFeatureFullyChecked ? true : isFeaturePartiallyChecked() ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            if (typeof checked === "boolean") {
              handleFeatureChange(checked);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <Label htmlFor={`feature-${feature}`} className="text-sm font-medium capitalize">
          {feature}
        </Label>
      </div>

      {expanded && (
        <div className="ml-6 space-y-1 pl-2 border-l border-border">
          {actions.map((action) => (
            <div key={`${feature}:${action}`} className="flex items-center space-x-2 py-1">
              <Checkbox
                id={`${feature}-${action}`}
                checked={checkedStates[`${feature}:${action}`] || false}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") {
                    handlePermissionChange(action, checked);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor={`${feature}-${action}`} className="text-sm capitalize">
                    {action.replaceAll("_", " ")}
                  </Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{`Can ${action.replaceAll("_", " ")} ${feature.replaceAll("_", " ")}`}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const PermissionsField: React.FC<AutoFormFieldProps> = ({ value, field, inputProps }) => {
  const customData = field?.fieldConfig?.customData;
  const tabs = customData?.tabs;
  const slug = customData?.slug;

  const groupedPermissions = useMemo(() => {
    return generatePermissions(tabs || []);
  }, [tabs]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 w-full">
          <span className="text-sm font-medium">Permissions</span>
          <span className="text-xs font-normal text-muted-foreground">
            {Array.isArray(value) ? value.length : 0} selected
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <ScrollArea className="h-64 w-full pr-4">
          <div className="space-y-2">
            {Object.entries(groupedPermissions).map(([feature, actions]) => (
              <PermissionGroup
                key={feature}
                feature={feature}
                actions={actions}
                value={value as string[] || []}
                onChange={(newPermissions) => {
                  // react-hook-form expects an event object
                  const event = {
                    target: {
                      name: field.key,
                      value: newPermissions,
                    },
                  };
                  inputProps.onChange(event);
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
