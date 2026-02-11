import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/contexts/theme-context';
import type { ThemeStyleProps } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface ThemeEditorProps extends React.ComponentProps<'div'> {
  compact?: boolean;
}

export function ThemeEditor({
  compact = false,
  className,
  props,
}: ThemeEditorProps) {
  const { theme, setTheme } = useTheme();
  const [lightTheme, setLightTheme] = useState(theme.light);
  const [darkTheme, setDarkTheme] = useState(theme.dark);

  const handleThemeChange = <const T extends 'light' | 'dark'>(
    mode: T,
    property: keyof ThemeStyleProps,
    value: ThemeStyleProps[keyof ThemeStyleProps],
  ) => {
    if (mode === 'light') {
      const newLightTheme = { ...lightTheme, [property]: value };
      setLightTheme(newLightTheme);
      setTheme((prev) => ({ ...prev, light: newLightTheme }));
    } else {
      const newDarkTheme = { ...darkTheme, [property]: value };
      setDarkTheme(newDarkTheme);
      setTheme((prev) => ({ ...prev, dark: newDarkTheme }));
    }
  };

  const themeProperties: (keyof ThemeStyleProps)[] = [
    'background',
    'foreground',
    'primary',
    'primary-foreground',
    'secondary',
    'secondary-foreground',
    'accent',
    'accent-foreground',
    'destructive',
    'destructive-foreground',
    'border',
    'input',
    'ring',
    'radius',
  ];

  if (compact) {
    return (
      <Card {...props} className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Theme Editor</CardTitle>
          <CardDescription>Customize your application theme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="light" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="light">Light Mode</TabsTrigger>
              <TabsTrigger value="dark">Dark Mode</TabsTrigger>
            </TabsList>
            <TabsContent value="light" className="space-y-4">
              {themeProperties.slice(0, 5).map((prop) => (
                <div
                  key={`light-${prop}`}
                  className="flex items-center space-x-2"
                >
                  <Label className="w-32 capitalize">
                    {prop.replace(/-/g, ' ')}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={lightTheme[prop] || '#000000'}
                      onChange={(e) =>
                        handleThemeChange('light', prop, e.target.value)
                      }
                      className="w-16 h-8 p-0 border"
                    />
                    <Input
                      value={lightTheme[prop] || ''}
                      onChange={(e) =>
                        handleThemeChange('light', prop, e.target.value)
                      }
                      className="w-32"
                    />
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="dark" className="space-y-4">
              {themeProperties.slice(0, 5).map((prop) => (
                <div
                  key={`dark-${prop}`}
                  className="flex items-center space-x-2"
                >
                  <Label className="w-32 capitalize">
                    {prop.replace(/-/g, ' ')}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="color"
                      value={darkTheme[prop] || '#000000'}
                      onChange={(e) =>
                        handleThemeChange('dark', prop, e.target.value)
                      }
                      className="w-16 h-8 p-0 border"
                    />
                    <Input
                      value={darkTheme[prop] || ''}
                      onChange={(e) =>
                        handleThemeChange('dark', prop, e.target.value)
                      }
                      className="w-32"
                    />
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setTheme({ light: lightTheme, dark: darkTheme });
              }}
            >
              Save Theme
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Theme Editor</CardTitle>
        <CardDescription>Customize your application theme</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="light" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="light">Light Mode</TabsTrigger>
            <TabsTrigger value="dark">Dark Mode</TabsTrigger>
          </TabsList>
          <TabsContent value="light" className="space-y-4">
            {themeProperties.map((prop) => (
              <div
                key={`light-${prop}`}
                className="flex items-center space-x-2"
              >
                <Label className="w-32 capitalize">
                  {prop.replace(/-/g, ' ')}
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={lightTheme[prop] || '#000000'}
                    onChange={(e) =>
                      handleThemeChange('light', prop, e.target.value)
                    }
                    className="w-16 h-8 p-0 border"
                  />
                  <Input
                    value={lightTheme[prop] || ''}
                    onChange={(e) =>
                      handleThemeChange('light', prop, e.target.value)
                    }
                    className="w-32"
                  />
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="dark" className="space-y-4">
            {themeProperties.map((prop) => (
              <div key={`dark-${prop}`} className="flex items-center space-x-2">
                <Label className="w-32 capitalize">
                  {prop.replace(/-/g, ' ')}
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="color"
                    value={darkTheme[prop] || '#000000'}
                    onChange={(e) =>
                      handleThemeChange('dark', prop, e.target.value)
                    }
                    className="w-16 h-8 p-0 border"
                  />
                  <Input
                    value={darkTheme[prop] || ''}
                    onChange={(e) =>
                      handleThemeChange('dark', prop, e.target.value)
                    }
                    className="w-32"
                  />
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setTheme({ light: lightTheme, dark: darkTheme });
            }}
          >
            Save Theme
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
