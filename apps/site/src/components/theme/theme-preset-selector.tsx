import { motion } from 'framer-motion';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/contexts/theme-context';
import { defaultPresets, type ThemeStyles } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Demo components to preview themes
const DemoCard = ({
  className = '',
  themeStyles,
  currentThemeMode,
}: {
  className?: string;
  themeStyles?: ThemeStyles;
  currentThemeMode?: 'light' | 'dark';
}) => {
  const themeToUse = themeStyles;
  if (!themeToUse) return null;
  // Use the current theme mode to determine which theme to display for the demo
  const displayTheme =
    currentThemeMode === 'dark'
      ? themeToUse.dark || {}
      : themeToUse.light || {};

  return (
    <div
      className={className}
      style={{ borderRadius: displayTheme.radius || 'var(--radius)' }}
    >
      <Card
        className="p-4"
        style={{
          backgroundColor: displayTheme.card || 'var(--card)',
          color: displayTheme['card-foreground'] || 'var(--card-foreground)',
          border: `1px solid ${displayTheme.border || 'var(--border)'}`,
          borderRadius: displayTheme.radius || 'var(--radius)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Avatar
            className="w-10 h-10"
            style={{ borderRadius: displayTheme.radius }}
          >
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <div>
            <div
              className="font-medium"
              style={{
                color:
                  displayTheme['card-foreground'] || 'var(--card-foreground)',
              }}
            >
              John Doe
            </div>
            <div
              className="text-sm"
              style={{
                color:
                  displayTheme['muted-foreground'] || 'var(--muted-foreground)',
              }}
            >
              Software Engineer
            </div>
          </div>
        </div>
        <p
          className="text-sm"
          style={{
            color: displayTheme['card-foreground'] || 'var(--card-foreground)',
          }}
        >
          This is a sample card component to demonstrate the theme preview.
        </p>
      </Card>
    </div>
  );
};

const DemoButton = ({
  variant = 'default',
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  className = '',
  themeStyles,
  currentThemeMode,
}: {
  variant?: string;
  className?: string;
  themeStyles?: ThemeStyles;
  currentThemeMode?: 'light' | 'dark';
}) => {
  const themeToUse = themeStyles || {};
  // Use the current theme mode to determine which theme to display for the demo
  const displayTheme =
    currentThemeMode === 'dark'
      ? themeToUse.dark || {}
      : themeToUse.light || {};
  let buttonStyle = {};
  let buttonClassName = 'h-9 px-4 py-2 text-sm font-medium transition-colors';

  if (variant === 'default') {
    buttonStyle = {
      backgroundColor: displayTheme.primary || 'hsl(var(--primary))',
      color:
        displayTheme['primary-foreground'] || 'hsl(var(--primary-foreground))',
      border: '1px solid transparent',
    };
    buttonClassName +=
      ' bg-primary text-primary-foreground hover:bg-primary/90';
  } else if (variant === 'outline') {
    buttonStyle = {
      backgroundColor: 'transparent',
      color: displayTheme.primary || 'hsl(var(--primary))',
      border: `1px solid ${displayTheme.border || 'hsl(var(--border))'}`,
    };
    buttonClassName +=
      ' border border-input bg-background hover:bg-accent hover:text-accent-foreground';
  } else {
    buttonStyle = {
      backgroundColor:
        displayTheme[variant as keyof typeof displayTheme] ||
        'hsl(var(--secondary))',
      color:
        displayTheme[`${variant}-foreground` as keyof typeof displayTheme] ||
        'hsl(var(--secondary-foreground))',
      border: '1px solid transparent',
    };
    buttonClassName +=
      ' bg-secondary text-secondary-foreground hover:bg-secondary/80';
  }

  return (
    <Button
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      variant={variant as any}
      className={buttonClassName}
      style={{
        ...buttonStyle,
        borderRadius: displayTheme.radius, // Apply the preset's radius
      }}
    >
      {variant.charAt(0).toUpperCase() + variant.slice(1)} Button
    </Button>
  );
};

export interface ThemePresetSelectorProps extends React.ComponentProps<'div'> {}

export function ThemePresetSelector({
  className,
  ...props
}: ThemePresetSelectorProps) {
  const { getAvailablePresets, applyPreset, currentThemeName, isDarkMode } =
    useTheme();
  const [selectedPreset, setSelectedPreset] = useState(
    currentThemeName || 'tangerine',
  );

  const handlePresetSelect = (presetName: string) => {
    setSelectedPreset(presetName);
    applyPreset(presetName);
  };

  const presets = getAvailablePresets();

  return (
    <div {...props} className={cn('space-y-6', className)}>
      <div>
        <h2 className="text-xl font-bold">Theme Presets</h2>
        <p className="text-muted-foreground">
          Choose from our collection of professionally designed themes
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {presets.map((preset) => {
          const presetData =
            defaultPresets[preset.name as keyof typeof defaultPresets];

          // Use the current theme mode to determine which theme to display for previews
          const themeToUse = isDarkMode
            ? presetData.styles.dark
            : presetData.styles.light;

          return (
            <motion.div
              key={preset.name}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer"
              onClick={() => handlePresetSelect(preset.name)}
            >
              <Card
                className={`h-full border-2 transition-all`}
                style={{
                  backgroundColor: themeToUse.background || 'var(--background)',
                  color: themeToUse.foreground || 'var(--foreground)',
                  border: `1px solid ${themeToUse.border || 'var(--border)'}`,
                  borderRadius: themeToUse.radius || 'var(--radius)',
                }}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3
                      className="font-semibold"
                      style={{
                        color: themeToUse.foreground || 'var(--foreground)',
                      }}
                    >
                      {preset.label}
                    </h3>
                    {selectedPreset === preset.name && (
                      <Badge className="text-xs">Active</Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1">
                      {/* Show theme colors as swatches with preset's border radius */}
                      <div
                        className="h-6"
                        style={{
                          backgroundColor: themeToUse.primary || '#3b82f6',
                          borderRadius: themeToUse.radius || 'var(--radius)',
                        }}
                      ></div>
                      <div
                        className="h-6"
                        style={{
                          backgroundColor: themeToUse.secondary || '#f3f4f6',
                          borderRadius: themeToUse.radius || 'var(--radius)',
                        }}
                      ></div>
                      <div
                        className="h-6"
                        style={{
                          backgroundColor: themeToUse.accent || '#e5e7eb',
                          borderRadius: themeToUse.radius || 'var(--radius)',
                        }}
                      ></div>
                    </div>

                    {/* Pass the current theme mode to DemoCard and DemoButton so they can display appropriately */}
                    <DemoCard
                      className="mb-2"
                      themeStyles={presetData.styles}
                      currentThemeMode={isDarkMode ? 'dark' : 'light'}
                    />
                    <div className="flex gap-2">
                      <DemoButton
                        variant="default"
                        className="flex-1"
                        themeStyles={presetData.styles}
                        currentThemeMode={isDarkMode ? 'dark' : 'light'}
                      />
                      <DemoButton
                        variant="outline"
                        className="flex-1"
                        themeStyles={presetData.styles}
                        currentThemeMode={isDarkMode ? 'dark' : 'light'}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
