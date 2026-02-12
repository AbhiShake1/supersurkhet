import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/theme-context';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function ThemeSelector() {
  const { currentThemeName, getAvailablePresets, applyPreset } = useTheme();

  const presets = getAvailablePresets();

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Theme:{' '}
            {currentThemeName
              ? presets.find((p) => p.name === currentThemeName)?.label ||
                currentThemeName
              : 'Default'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 max-h-96 overflow-y-auto"
        >
          {presets.map((preset) => (
            <DropdownMenuItem
              key={preset.name}
              onClick={() => applyPreset(preset.name)}
              className="capitalize"
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeToggle />
    </div>
  );
}
