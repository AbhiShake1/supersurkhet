import type { ShortcutDefinition } from '@/components/ui/keyboard-shortcuts';

export type TemplateSheetTab = 'marketplace' | 'publish';

export type TemplateShortcutAction =
  | 'openSheet'
  | 'switchMarketplaceTab'
  | 'switchPublishTab'
  | 'focusMarketplaceSearch'
  | 'previewInstall'
  | 'applyTemplate'
  | 'publishTemplate';

const TEMPLATE_SHORTCUT_SCOPE = 'UI Builder Templates';

export const TEMPLATE_SHORTCUTS = {
  openSheet: {
    id: 'uiBuilder.templates.openSheet',
    label: 'Open templates sheet',
    description: 'Open the UI template marketplace and publish sheet.',
    scope: TEMPLATE_SHORTCUT_SCOPE,
    defaultBinding: {
      key: 't',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  switchMarketplaceTab: {
    id: 'uiBuilder.templates.switchMarketplaceTab',
    label: 'Switch to marketplace tab',
    description: 'Switch templates sheet to Marketplace.',
    scope: TEMPLATE_SHORTCUT_SCOPE,
    defaultBinding: {
      key: '1',
      ctrl: false,
      meta: true,
      alt: true,
      shift: false,
    },
  },
  switchPublishTab: {
    id: 'uiBuilder.templates.switchPublishTab',
    label: 'Switch to publish tab',
    description: 'Switch templates sheet to Publish.',
    scope: TEMPLATE_SHORTCUT_SCOPE,
    defaultBinding: {
      key: '2',
      ctrl: false,
      meta: true,
      alt: true,
      shift: false,
    },
  },
  focusMarketplaceSearch: {
    id: 'uiBuilder.templates.focusMarketplaceSearch',
    label: 'Focus template search',
    description: 'Focus search input in template marketplace.',
    scope: TEMPLATE_SHORTCUT_SCOPE,
    defaultBinding: {
      key: '/',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  previewInstall: {
    id: 'uiBuilder.templates.previewInstall',
    label: 'Preview template install',
    description: 'Run install preview for selected template version.',
    scope: TEMPLATE_SHORTCUT_SCOPE,
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  applyTemplate: {
    id: 'uiBuilder.templates.applyTemplate',
    label: 'Apply template install',
    description: 'Install selected template after preview checks pass.',
    scope: TEMPLATE_SHORTCUT_SCOPE,
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  publishTemplate: {
    id: 'uiBuilder.templates.publishTemplate',
    label: 'Publish template',
    description: 'Publish current builder state as a template release.',
    scope: TEMPLATE_SHORTCUT_SCOPE,
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: true,
      alt: true,
      shift: false,
    },
  },
} as const satisfies Record<TemplateShortcutAction, ShortcutDefinition>;

export const TEMPLATE_SHORTCUT_DEFINITIONS = Object.values(
  TEMPLATE_SHORTCUTS,
) as ShortcutDefinition[];

export const TEMPLATE_SHORTCUT_IDS = Object.fromEntries(
  Object.entries(TEMPLATE_SHORTCUTS).map(([action, definition]) => [
    action,
    definition.id,
  ]),
) as Record<TemplateShortcutAction, string>;

export function getTemplateShortcut(action: TemplateShortcutAction) {
  return TEMPLATE_SHORTCUTS[action];
}

export function isTemplateShortcutActionId(actionId: string) {
  return TEMPLATE_SHORTCUT_DEFINITIONS.some(
    (definition) => definition.id === actionId,
  );
}
