"use client";

import { useEffect, useMemo, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { ChevronDown, ChevronRight } from "lucide-react";
import { generatePermissions } from "@/lib/permissions/generate-permissions";
import type { AutoFormFieldProps } from "@autoform/react";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type PermissionMap = Record<string, boolean>;

interface PermissionGroupProps {
  feature: string;
  actions: string[];
  value: PermissionMap;
  onChange: (permissions: PermissionMap) => void;
}

/* -------------------------------------------------------------------------- */
/*                             Permission Group                                */
/* -------------------------------------------------------------------------- */

function PermissionGroup({
  feature,
  actions,
  value,
  onChange,
}: PermissionGroupProps) {
  const [expanded, setExpanded] = useState(true);

  const permissionKeys = useMemo(
    () => actions.map(action => `${feature}:${action}`),
    [feature, actions]
  );

  const isFeatureFullyChecked = permissionKeys.every(
    key => value[key]
  );

  const isFeaturePartiallyChecked =
    permissionKeys.some(key => value[key]) && !isFeatureFullyChecked;

  const toggleFeature = (checked: boolean) => {
    const next: PermissionMap = { ...value };
    for (const key of permissionKeys) {
      next[key] = checked;
    }
    onChange(next);
  };

  const toggleAction = (action: string, checked: boolean) => {
    const key = `${feature}:${action}`;
    const next = { ...value, [key]: checked };
    onChange(next);
  };

  return (
    <div className="space-y-1">
      {/* <div
        className="flex items-center space-x-2 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      > */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          className="cursor-pointer"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <Checkbox
          id={`feature-${feature}`}
          checked={
            isFeatureFullyChecked
              ? true
              : isFeaturePartiallyChecked
                ? "indeterminate"
                : false
          }
          onCheckedChange={checked => {
            if (typeof checked === "boolean") toggleFeature(checked);
          }}
          onClick={e => e.stopPropagation()}
        />

        <Label
          htmlFor={`feature-${feature}`}
          className="text-sm font-medium capitalize cursor-pointer"
          onClick={() => setExpanded(v => !v)}
        >
          {feature.replaceAll("_", " ")}
        </Label>
      </div>

      {expanded && (
        <div className="ml-6 space-y-1 pl-2 border-l border-border">
          {actions.map(action => {
            const key = `${feature}:${action}`;
            return (
              <div key={key} className="flex items-center space-x-2 py-1">
                <Checkbox
                  id={key}
                  checked={!!value[key]}
                  onCheckedChange={checked => {
                    if (typeof checked === "boolean") toggleAction(action, checked);
                  }}
                  onClick={e => e.stopPropagation()}
                />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor={key} className="text-sm capitalize">
                        {action.replaceAll("_", " ")}
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {`Can ${action.replaceAll("_", " ")} ${feature.replaceAll("_", " ")}`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Permissions Field                              */
/* -------------------------------------------------------------------------- */

interface PermissionsFieldProps extends AutoFormFieldProps {
}

export const PermissionsField: React.FC<PermissionsFieldProps> = ({ path, field, id, inputProps, value: _value }) => {

  const name = path.join(".");
  const tabs = field.fieldConfig?.customData?.tabs;

  // Update local state when prop changes
  const [localValue, setLocalValue] = useState(() => _value || field.default || {});
  useEffect(() => {
    setLocalValue(_value || field.default || {});
  }, [_value, field.default]);

  const groupedPermissions = useMemo(
    () => generatePermissions(tabs || []),
    [tabs]
  );

  return (
    <Popover modal>
      <PopoverTrigger asChild id={id}>
        <Button variant="outline" className="flex items-center gap-2 w-full">
          <span className="text-sm font-medium">Permissions</span>
          <span className="text-xs font-normal text-muted-foreground">
            {Object.values(localValue).filter(Boolean).length} selected
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80">
        <ScrollArea className="h-64 w-full pr-4">
          <div className="space-y-2" onBlur={inputProps.onBlur}>
            {Object.entries(groupedPermissions).map(([feature, actions]) => (
              <PermissionGroup
                key={feature}
                feature={feature}
                actions={actions}
                value={localValue}
                onChange={(permissions) => {

                  const updatedPermissions = { ...localValue };
                  Object.keys(permissions).forEach(key => {
                    updatedPermissions[key] = permissions[key];
                  });
                  setLocalValue(updatedPermissions);

                  inputProps.onChange({
                    target: {
                      value: updatedPermissions,
                      name,
                    },
                  });
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
