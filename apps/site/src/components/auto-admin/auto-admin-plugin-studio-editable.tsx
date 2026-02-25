import {
  AutoAdmin,
  type AutoAdminSystemTabs,
  type AutoAdminTabInput,
} from '@/components/auto-admin';

type EditablePluginStudioAutoAdminProps = {
  tabs: AutoAdminTabInput[];
  tabOrder?: readonly string[];
  systemTabs: AutoAdminSystemTabs;
  groups?: string[];
  onAddTable?: (targetGroupName?: string) => void;
  onAddGroup?: (
    groupName?: string,
    options?: { relativeTo?: string; position?: 'above' | 'below' },
  ) => void;
  onReorderGroups?: (
    fromGroupName: string,
    toGroupName: string,
    position?: 'above' | 'below',
  ) => void;
  onMoveTabToGroup?: (tabTitle: string, groupName?: string) => void;
  onReorderTabs?: (
    fromTabTitle: string,
    toTabTitle: string,
    position?: 'above' | 'below',
  ) => void;
  onRenameGroup?: (previousGroupName: string, nextGroupName: string) => void;
  onDeleteGroup?: (groupName: string) => void;
  onRenameTab?: (previousTabTitle: string, nextTabTitle: string) => void;
  onRenameTabIcon?: (tabTitle: string, iconName: string) => void;
  onOpenWorkflowEditorForTab?: (tabTitle: string) => void;
  onDeleteTableForTab?: (tabTitle: string) => void;
  onSystemTabChange?: (
    key: 'dashboard' | 'qr',
    next: { title: string; group?: string; iconName?: string },
  ) => void;
};

export function PluginStudioEditableAutoAdmin(
  props: EditablePluginStudioAutoAdminProps,
) {
  return <AutoAdmin {...props} editable />;
}
