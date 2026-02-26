'use client';
import { CheckIcon, InfoIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import {
  type BaseColor,
  baseColors,
} from '@/components/ui/ui-builder/internal/utils/base-colors';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { useLayerStore } from '@/lib/ui-builder/store/layer-store';
import { cn } from '@/lib/utils';

const RESET_THEME_PROPS = {
  style: undefined,
  'data-mode': undefined,
  'data-color-theme': undefined,
  'data-border-radius': undefined,
} as const;

export function TailwindThemePanel() {
  const {
    selectedPageId,
    updateLayer: updateLayerProps,
    findLayerById,
  } = useLayerStore();
  const selectedPageData = findLayerById(selectedPageId) as ComponentLayer;
  const isCustomTheme =
    selectedPageData?.props['data-color-theme'] !== undefined;

  const handleOnToggle = useCallback(() => {
    if (!selectedPageData) return;
    if (isCustomTheme) {
      updateLayerProps(selectedPageId, RESET_THEME_PROPS);
      return;
    }

    const colorThemeValue = selectedPageData.props?.['data-color-theme'];
    const modeValue = selectedPageData.props?.['data-mode'];
    const borderRadiusValue =
      selectedPageData.props?.['data-border-radius'] ??
      selectedPageData.props?.borderRadius;
    const nextColorTheme = (
      typeof colorThemeValue === 'string' ? colorThemeValue : 'red'
    ) as BaseColor['name'];
    const nextMode = (typeof modeValue === 'string' ? modeValue : 'light') as
      | 'light'
      | 'dark';
    const nextBorderRadius =
      typeof borderRadiusValue === 'number' ? borderRadiusValue : 0.5;
    const themeStyle = resolveThemeLayerStyle(
      nextColorTheme,
      nextMode,
      nextBorderRadius,
    );
    updateLayerProps(selectedPageId, {
      style: themeStyle,
      'data-mode': nextMode,
      'data-color-theme': nextColorTheme,
      'data-border-radius': nextBorderRadius,
    });
  }, [isCustomTheme, selectedPageData, selectedPageId, updateLayerProps]);

  return (
    <div className="flex flex-col gap-4 mt-4">
      <Toggle
        variant="outline"
        onPressedChange={handleOnToggle}
        aria-label="Toggle italic"
      >
        {isCustomTheme ? 'Use Default Theme' : 'Use Custom Theme'}
      </Toggle>
      {!isCustomTheme && (
        <span className="flex items-center gap-2">
          <InfoIcon className="size-4" /> Using Your Project&apos;s Theme
        </span>
      )}
      {selectedPageData && isCustomTheme && (
        <ThemePicker
          key={selectedPageId}
          isDisabled={!isCustomTheme}
          pageLayer={selectedPageData}
        />
      )}
    </div>
  );
}

function ThemePicker({
  className,
  isDisabled,
  pageLayer,
}: {
  className?: string;
  isDisabled: boolean;
  pageLayer: ComponentLayer;
}) {
  const { updateLayer: updateLayerProps } = useLayerStore();

  // Safely extract values with type checking
  const colorThemeValue = pageLayer.props?.['data-color-theme'];
  const modeValue = pageLayer.props?.['data-mode'];
  const borderRadiusValue =
    pageLayer.props?.['data-border-radius'] ?? pageLayer.props?.borderRadius;
  const colorTheme = (
    typeof colorThemeValue === 'string' ? colorThemeValue : 'red'
  ) as BaseColor['name'];
  const borderRadius =
    typeof borderRadiusValue === 'number' ? borderRadiusValue : 0.5;
  const mode = (typeof modeValue === 'string' ? modeValue : 'light') as
    | 'light'
    | 'dark';

  const applyTheme = useCallback(
    (
      nextColorTheme: BaseColor['name'],
      nextMode: 'light' | 'dark',
      nextBorderRadius: number,
    ) => {
      if (isDisabled) return;
      const themeStyle = resolveThemeLayerStyle(
        nextColorTheme,
        nextMode,
        nextBorderRadius,
      );
      updateLayerProps(pageLayer.id, {
        style: themeStyle,
        'data-mode': nextMode,
        'data-color-theme': nextColorTheme,
        'data-border-radius': nextBorderRadius,
      });
    },
    [isDisabled, pageLayer.id, updateLayerProps],
  );

  const colorOptions = useMemo(
    () =>
      baseColors.map((color: BaseColor) => {
        return (
          <ThemeColorOption
            key={color.name}
            color={color}
            colorTheme={colorTheme}
            mode={mode}
            onClick={(nextColorTheme) =>
              applyTheme(nextColorTheme, mode, borderRadius)
            }
          />
        );
      }),
    [applyTheme, borderRadius, colorTheme, mode],
  );
  const borderRadiusOptions = useMemo(
    () =>
      [0.0, 0.15, 0.3, 0.5, 0.75, 1.0].map((radius) => {
        return (
          <ThemeBorderRadiusOption
            key={radius}
            radius={radius}
            borderRadius={borderRadius}
            onClick={(nextBorderRadius) =>
              applyTheme(colorTheme, mode, nextBorderRadius)
            }
          />
        );
      }),
    [applyTheme, borderRadius, colorTheme, mode],
  );

  const modeOptions = useMemo(
    () =>
      (['light', 'dark'] as const).map((modeOption) => {
        return (
          <ThemeModeOption
            key={modeOption}
            mode={mode}
            modeOption={modeOption}
            onClick={(nextMode) =>
              applyTheme(colorTheme, nextMode, borderRadius)
            }
          />
        );
      }),
    [applyTheme, borderRadius, colorTheme, mode],
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        className,
        isDisabled && 'opacity-30 pointer-events-none',
      )}
    >
      <Label className="mt-2">Colors</Label>
      <div className="flex gap-2 flex-wrap">{colorOptions}</div>
      <Label className="mt-2">Border Radius</Label>
      <div className="flex gap-2 flex-wrap">{borderRadiusOptions}</div>
      <Label className="mt-2">Mode</Label>
      <div className="flex gap-2">{modeOptions}</div>
    </div>
  );
}

function ThemeColorOption({
  color,
  colorTheme,
  mode,
  onClick,
}: {
  color: BaseColor;
  colorTheme: string;
  mode: 'light' | 'dark';
  onClick: (name: BaseColor['name']) => void;
}) {
  const handleOnClick = useCallback(() => {
    onClick(color.name);
  }, [onClick, color.name]);

  const style = useMemo(
    () => ({
      backgroundColor: `hsl(${
        color.activeColor[mode === 'dark' ? 'dark' : 'light']
      })`,
    }),
    [color.activeColor, mode],
  );

  return (
    <Button
      key={color.name}
      variant="outline"
      size="sm"
      className={cn(
        'gap-2',
        color.name === colorTheme && 'border-primary border-2',
      )}
      onClick={handleOnClick}
    >
      <div className="size-4 rounded-full" style={style}>
        {color.name === colorTheme && <CheckIcon className="size-4" />}
      </div>
      {color.label}
    </Button>
  );
}

function ThemeBorderRadiusOption({
  radius,
  borderRadius,
  onClick,
}: {
  radius: number;
  borderRadius: number;
  onClick: (radius: number) => void;
}) {
  const handleOnClick = useCallback(() => {
    onClick(radius);
  }, [onClick, radius]);

  const style = useMemo(
    () => ({
      borderRadius: `${radius}rem`,
    }),
    [radius],
  );

  return (
    <Button
      key={radius}
      variant="outline"
      size="sm"
      className={cn(
        'gap-2',
        radius === borderRadius && 'border-primary border-2',
      )}
      onClick={handleOnClick}
    >
      <div className="size-6 rounded-sm bg-secondary overflow-hidden">
        <div
          className="size-10 ml-2 mt-2 border-2 border-secondary-foreground"
          style={style}
        />
      </div>
      {radius}
    </Button>
  );
}

function ThemeModeOption({
  modeOption,
  mode,
  onClick,
}: {
  modeOption: 'light' | 'dark';
  mode: 'light' | 'dark';
  onClick: (mode: 'light' | 'dark') => void;
}) {
  const handleOnClick = useCallback(() => {
    onClick(modeOption);
  }, [onClick, modeOption]);

  return (
    <Button
      key={modeOption}
      variant="outline"
      size="sm"
      onClick={handleOnClick}
      className={cn(mode === modeOption && 'border-2 border-primary')}
    >
      {modeOption === 'light' ? (
        <SunIcon className="mr-1 -translate-x-1" />
      ) : (
        <MoonIcon className="mr-1 -translate-x-1" />
      )}
      {modeOption}
    </Button>
  );
}

export function resolveThemeLayerStyle(
  colorTheme: BaseColor['name'],
  mode: 'light' | 'dark',
  borderRadius: number,
) {
  const colorThemeData = baseColors.find((color) => color.name === colorTheme);
  if (!colorThemeData) {
    return undefined;
  }
  const colorDataWithBorder = {
    ...colorThemeData,
    cssVars: {
      ...colorThemeData.cssVars,
      [mode]: {
        ...colorThemeData.cssVars[mode],
        radius: `${borderRadius}rem`,
      },
    },
  } as const;
  return themeToStyleVars(colorDataWithBorder.cssVars[mode]);
}

function themeToStyleVars(
  colors:
    | BaseColor['cssVars']['dark']
    | BaseColor['cssVars']['light']
    | undefined,
) {
  if (!colors) {
    return undefined;
  }
  const styleVariables = Object.entries(colors).reduce(
    (acc, [key, value]) => {
      acc[`--${key}`] = value;
      return acc;
    },
    {} as { [key: string]: string },
  );
  const globalOverrides = {
    color: `hsl(${colors.foreground})`,
    borderColor: `hsl(${colors.border})`,
  };
  return { ...styleVariables, ...globalOverrides };
}
