'use client';

import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { generatePermissions } from '@/lib/permissions/generate-permissions';
import { cn } from '@/lib/utils';
import type { AutoFormFieldProps } from '../react';

type PermissionMap = Record<string, boolean>;

interface PermissionGroupProps {
  feature: string;
  actions: string[];
  value: PermissionMap;
  onChange: (permissions: PermissionMap) => void;
}

function PermissionGroup({
  feature,
  actions,
  value,
  onChange,
}: PermissionGroupProps) {
  const permissionKeys = useMemo(
    () => actions.map((action) => `${feature}:${action}`),
    [feature, actions],
  );

  const isFeatureFullyChecked = permissionKeys.every((key) => value[key]);
  const isFeaturePartiallyChecked =
    permissionKeys.some((key) => value[key]) && !isFeatureFullyChecked;

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
    <div className="rounded-xl border bg-card/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold capitalize">
            {feature.replaceAll('_', ' ')}
          </Label>
          <Badge variant="secondary" className="rounded-md text-[10px]">
            {actions.length}
          </Badge>
        </div>
        <Checkbox
          id={`feature-${feature}`}
          checked={
            isFeatureFullyChecked
              ? true
              : isFeaturePartiallyChecked
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(checked) => {
            if (typeof checked === 'boolean') toggleFeature(checked);
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const key = `${feature}:${action}`;
          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
                value[key] ? 'border-primary/50 bg-primary/5' : 'bg-background',
              )}
            >
              <Checkbox
                id={key}
                checked={!!value[key]}
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean')
                    toggleAction(action, checked);
                }}
              />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor={key} className="text-sm capitalize">
                      {action.replaceAll('_', ' ')}
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {`Can ${action.replaceAll('_', ' ')} ${feature.replaceAll('_', ' ')}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PermissionsFieldProps extends AutoFormFieldProps {}

const defaultAdditionalFeatures = [
  { feature: 'business', actions: ['read', 'create', 'update', 'delete'] },
  {
    feature: 'dataMatrixAction',
    actions: ['read', 'create', 'update', 'delete'],
  },
  { feature: 'qrFlowConfig', actions: ['read', 'create', 'update', 'delete'] },
  {
    feature: 'organizationMember',
    actions: ['read', 'create', 'update', 'delete'],
  },
  {
    feature: 'organizationInvitation',
    actions: ['read', 'create', 'update', 'delete'],
  },
] as const;

export const PermissionsField: React.FC<PermissionsFieldProps> = ({
  path,
  field,
  id,
  inputProps,
  value: _value,
}) => {
  const name = path.join('.');
  const tabs = field.fieldConfig?.customData?.tabs;
  const additionalFeatures =
    field.fieldConfig?.customData?.permissionFeatures ??
    defaultAdditionalFeatures;
  const [searchQuery, setSearchQuery] = useState('');

  const [localValue, setLocalValue] = useState(
    () => _value || field.default || {},
  );
  useEffect(() => {
    setLocalValue(_value || field.default || {});
  }, [_value, field.default]);

  const groupedPermissions = useMemo(
    () =>
      generatePermissions(tabs || [], {
        additionalFeatures: [...additionalFeatures],
      }),
    [tabs, additionalFeatures],
  );

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const entries = Object.entries(groupedPermissions);
    if (!query) return entries;

    return entries.filter(([feature, actions]) => {
      const featureLabel = feature.replaceAll('_', ' ').toLowerCase();
      if (featureLabel.includes(query)) return true;
      return actions.some((action) => action.toLowerCase().includes(query));
    });
  }, [groupedPermissions, searchQuery]);

  const selectedCount = useMemo(
    () => Object.values(localValue).filter(Boolean).length,
    [localValue],
  );

  const setVisibleCheckedState = (checked: boolean) => {
    const updatedPermissions = { ...localValue };
    for (const [feature, actions] of filteredGroups) {
      for (const action of actions) {
        updatedPermissions[`${feature}:${action}`] = checked;
      }
    }
    setLocalValue(updatedPermissions);
    inputProps.onChange({
      target: {
        value: updatedPermissions,
        name,
      },
    });
  };

  return (
    <Popover modal>
      <PopoverTrigger asChild id={id}>
        <Button variant="outline" className="flex w-full items-center gap-2">
          <span className="text-sm font-medium">Permissions</span>
          <span className="text-xs font-normal text-muted-foreground">
            {selectedCount} selected
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(96vw,980px)] p-0">
        <div className="border-b px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Permissions</p>
              <p className="text-xs text-muted-foreground">
                {selectedCount} selected
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVisibleCheckedState(true)}
              >
                Select Visible
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCheckedState(false)}
              >
                Clear Visible
              </Button>
            </div>
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search module or action..."
            leadingIcon={<Search className="h-4 w-4" />}
          />
        </div>

        <ScrollArea className="h-[70vh] max-h-[720px] w-full p-4">
          {/** biome-ignore lint/a11y/noStaticElementInteractions: lint debt cleanup */}
          <div className="space-y-2" onBlur={inputProps.onBlur}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredGroups.map(([feature, actions]) => (
                <PermissionGroup
                  key={feature}
                  feature={feature}
                  actions={actions}
                  value={localValue}
                  onChange={(permissions) => {
                    const updatedPermissions = { ...localValue };
                    Object.keys(permissions).forEach((key) => {
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
            {filteredGroups.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No matching permissions found.
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
