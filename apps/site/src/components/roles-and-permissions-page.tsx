import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Save
} from "lucide-react";
import { appSchema } from "@/lib/schema";
import { useAuth } from "./auth-provider";
import { useEffect, useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { PopoverClose } from "@radix-ui/react-popover";
import type { PossibleTabConfig } from "./auto-admin";

interface PermissionAction {
  feature: string;
  action: string;
}

interface RolesMatrixProps {
  slug?: string;
}

export function RolesAndPermissionsPage({ slug, tabs }: RolesMatrixProps & { tabs: PossibleTabConfig[] }) {
  // Get permissions based on business type or global schema
  const permissions = useMemo(() => {
    // Extract schema names from tabs to generate permissions
    const schemaNames = tabs
      .filter(tab => 'schema' in tab)
      .map(tab => tab.schema as string);

    // Generate CRUD permissions for each schema
    const perms: PermissionAction[] = [];
    for (const schemaName of schemaNames) {
      perms.push({ feature: schemaName, action: "read" });
      perms.push({ feature: schemaName, action: "create" });
      perms.push({ feature: schemaName, action: "update" });
      perms.push({ feature: schemaName, action: "delete" });
    }

    return perms;
  }, [tabs]);

  // Group permissions by feature
  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, perm) => {
      if (!acc[perm.feature]) {
        acc[perm.feature] = [];
      }
      acc[perm.feature].push(perm.action);
      return acc;
    }, {} as Record<string, string[]>);
  }, [permissions]);

  return (
    <TooltipProvider>
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Roles & Permissions</h2>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">New Role</Button>
              <Button size="sm">Save Changes</Button>
            </div>
          </div>

          <div className="flex space-x-4">
            <div className="w-64 flex-shrink-0">
              <h3 className="font-semibold mb-3">Available Roles</h3>
              <div className="space-y-1">
                {["Admin", "Manager", "Employee", "ReadOnly"].map((role) => (
                  <Button
                    key={role}
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search permissions..."
                  className="pl-8 h-8"
                />
              </div>

              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {Object.entries(groupedPermissions).map(([feature, actions]) => (
                    <PermissionGroup key={feature} feature={feature} actions={actions} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface PermissionGroupProps {
  feature: string;
  actions: string[];
}

function PermissionGroup({ feature, actions }: PermissionGroupProps) {
  const [expanded, setExpanded] = useState(true);

  const [checkedStates, setCheckedStates] = useState<Record<string, boolean>>({});

  // Initialize the checked states
  useEffect(() => {
    const initialStates: Record<string, boolean> = {};
    for (const action of actions) {
      initialStates[`${feature}:${action}`] = false;
    }
    setCheckedStates(initialStates);
  }, [feature, actions]);

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
    for (const action of actions) {
      newCheckedStates[`${feature}:${action}`] = checked;
    }
    setCheckedStates(newCheckedStates);
  };

  const handlePermissionChange = (action: string, checked: boolean) => {
    setCheckedStates(prev => ({
      ...prev,
      [`${feature}:${action}`]: checked
    }));
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
          onCheckedChange={(checked) => handleFeatureChange(checked as boolean)}
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
                onCheckedChange={(checked) => handlePermissionChange(action, checked as boolean)}
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
