import { useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface AppDrawerSettingsProps {
  settings: {
    gridColumns: number;
    iconSize: 'sm' | 'md' | 'lg';
  };
  onSettingsChange: (
    newSettings: Partial<{
      gridColumns: number;
      iconSize: 'sm' | 'md' | 'lg';
    }>,
  ) => void;
  onClose: () => void;
}

export function AppDrawerSettings({
  settings,
  onSettingsChange,
  onClose,
}: AppDrawerSettingsProps) {
  const [tempSettings, setTempSettings] = useState(settings);

  const handleSave = () => {
    onSettingsChange(tempSettings);
    onClose();
  };

  const handleReset = () => {
    setTempSettings((prev) => ({
      ...prev,
      gridColumns: 4,
      iconSize: 'md',
    }));
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="grid-columns">Grid Columns</Label>
          {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
          <Slider
            id="grid-columns"
            min={2}
            max={8}
            step={1}
            value={[tempSettings.gridColumns]}
            onValueChange={([value]) =>
              setTempSettings({ ...tempSettings, gridColumns: value })
            }
            className="w-full"
          />
          <div className="text-center text-sm text-muted-foreground">
            {tempSettings.gridColumns} columns
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="icon-size">Icon Size</Label>
          <Select
            value={tempSettings.iconSize}
            onValueChange={(value: 'sm' | 'md' | 'lg') =>
              setTempSettings({ ...tempSettings, iconSize: value })
            }
          >
            {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
            <SelectTrigger id="icon-size">
              <SelectValue placeholder="Select icon size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </div>
    </div>
  );
}
