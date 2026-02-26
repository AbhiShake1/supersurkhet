import { Check, ChevronDown, Moon, Palette, Sun } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTheme } from '@/contexts/theme-context';
import { defaultPresets } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps extends React.ComponentProps<typeof Button> {}

const ColorSwatch = ({ color }: { color: string }) => (
  <div
    className="h-3 w-3 rounded-sm border border-border"
    style={{ backgroundColor: color }}
  />
);

export function ThemeToggle({ className, ...props }: ThemeToggleProps) {
  const {
    isDarkMode,
    toggleDarkMode,
    getAvailablePresets,
    applyPreset,
    currentThemeName,
  } = useTheme();
  const [open, setOpen] = useState(false);

  const handleThemeToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const { clientX: x, clientY: y } = event;
    toggleDarkMode({ x, y });
  };

  const presets = getAvailablePresets();
  const currentPreset = presets.find(
    (preset) => preset.name === currentThemeName,
  );

  return (
    <ButtonGroup className="items-center">
      <Button
        variant="outline"
        onClick={handleThemeToggle}
        size="icon"
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>
      <Popover modal open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
            {...props}
          >
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {currentPreset?.label || currentThemeName || 'Select theme...'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <Command>
            <CommandInput placeholder="Search themes..." />
            <ScrollArea className="h-[400px]">
              <CommandEmpty>No theme found.</CommandEmpty>
              <CommandGroup>
                {presets.map((preset) => {
                  const presetData =
                    defaultPresets[preset.name as keyof typeof defaultPresets];
                  // Use the current theme mode to determine which theme to display for previews
                  const themeToUse = isDarkMode
                    ? presetData.styles.dark
                    : presetData.styles.light;

                  return (
                    <CommandItem
                      key={preset.name}
                      value={preset.name}
                      onSelect={() => {
                        applyPreset(preset.name);
                        setOpen(false);
                      }}
                      className="p-3"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <ColorSwatch
                              color={themeToUse.primary || '#3b82f6'}
                            />
                            <ColorSwatch
                              color={themeToUse.secondary || '#f3f4f6'}
                            />
                            <ColorSwatch
                              color={themeToUse.accent || '#e5e7eb'}
                            />
                            <ColorSwatch
                              color={themeToUse.border || '#e5e7eb'}
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {preset.label}
                            </span>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            'h-4 w-4',
                            currentThemeName === preset.name
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
    </ButtonGroup>
  );
}
