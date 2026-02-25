import type { TemplateSheetTab } from './template-shortcuts';

export const TEMPLATE_SHEET_TAB_ORDER: TemplateSheetTab[] = [
  'marketplace',
  'publish',
];

export type TemplateFocusTarget =
  | 'shortcut-settings'
  | 'search'
  | 'template-list'
  | 'version-select'
  | 'preview-button'
  | 'apply-button'
  | 'publish-button';

export const TEMPLATE_MARKETPLACE_FOCUS_ORDER: TemplateFocusTarget[] = [
  'shortcut-settings',
  'search',
  'template-list',
  'version-select',
  'preview-button',
  'apply-button',
];

export const TEMPLATE_PUBLISH_FOCUS_ORDER: TemplateFocusTarget[] = [
  'shortcut-settings',
  'publish-button',
];

export function getTemplateTabOrder() {
  return [...TEMPLATE_SHEET_TAB_ORDER];
}

export function getTemplateTabIndex(tab: TemplateSheetTab) {
  return TEMPLATE_SHEET_TAB_ORDER.indexOf(tab);
}

export function getNextTemplateTab(
  current: TemplateSheetTab,
  direction: 'next' | 'previous',
): TemplateSheetTab {
  const order = TEMPLATE_SHEET_TAB_ORDER;
  const currentIndex = getTemplateTabIndex(current);
  if (currentIndex < 0) return order[0] ?? 'marketplace';
  const delta = direction === 'next' ? 1 : -1;
  const nextIndex = (currentIndex + delta + order.length) % order.length;
  return order[nextIndex] ?? order[0] ?? 'marketplace';
}

export function getFocusOrderForTab(tab: TemplateSheetTab) {
  if (tab === 'publish') return [...TEMPLATE_PUBLISH_FOCUS_ORDER];
  return [...TEMPLATE_MARKETPLACE_FOCUS_ORDER];
}

export function focusTemplateTarget(
  target: TemplateFocusTarget,
  refs: Partial<Record<TemplateFocusTarget, HTMLElement | null>>,
) {
  const element = refs[target];
  if (!element) return false;
  element.focus();
  return true;
}

export function focusFirstTemplateTarget(
  tab: TemplateSheetTab,
  refs: Partial<Record<TemplateFocusTarget, HTMLElement | null>>,
) {
  for (const target of getFocusOrderForTab(tab)) {
    if (focusTemplateTarget(target, refs)) return target;
  }
  return null;
}

export function isEventWithinTemplateScope(
  event: KeyboardEvent,
  scope: HTMLElement | null,
) {
  if (!scope) return false;
  const target = event.target as Node | null;
  const active = document.activeElement as Node | null;
  if (target && scope.contains(target)) return true;
  if (active && scope.contains(active)) return true;
  return false;
}
