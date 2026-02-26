import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@tanstack/react-router';
import { AppWindow, Folder as FolderIcon } from 'lucide-react';
import { memo, useState } from 'react';
import {
  AndroidFolder,
  AndroidFolderContent,
  AndroidFolderTrigger,
} from '@/components/ui/android-folder';
import type { Business } from '@/lib/schema';
import type { Folder } from '@/lib/schemas/folder-schema';
import { getAppIcon } from '@/lib/utils';
import { Editable, EditableInput, EditablePreview } from '../ui/editable';
import { useFolders } from './folders-context';
import { useRecentlyUsedApps } from './recently-used-apps-context';

interface AppGridProps {
  businesses: Business[];
  allBusinessesForFolders?: Business[];
  gridColumns: number;
  iconSize: 'sm' | 'md' | 'lg';
  isAllApps?: boolean; // Add this prop to indicate if it's the all apps section
}

// Find the item being dragged
function findItem(
  id: UniqueIdentifier,
  businesses: Business[],
  folders: Folder[],
) {
  // Look for the app in businesses
  const business = businesses.find((b) => b._?.soul === id);
  if (business) {
    return { type: 'app' as const, item: business };
  }

  // Look for a folder
  const folder = folders.find((f) => f._?.soul === id);
  if (folder) {
    return { type: 'folder' as const, item: folder };
  }

  // Look for an app inside a folder
  for (const folder of folders) {
    if (folder.apps?.[id as string]) {
      const appInFolder = businesses.find((b) => b._?.soul === id);
      if (appInFolder) {
        return {
          type: 'app-in-folder' as const,
          item: appInFolder,
          folderId: folder._?.soul,
        };
      }
    }
  }

  return null;
}

function AppGridComponent({
  businesses,
  allBusinessesForFolders,
  gridColumns,
  iconSize,
  isAllApps = false,
}: AppGridProps) {
  // Size classes mapping
  const gridColumnClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
  };

  const { addRecentlyUsedApp } = useRecentlyUsedApps();
  const { folders, createFolder, updateFolder, deleteFolder } = useFolders();

  // State for drag and drop
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [_dragOverId, setDragOverId] = useState<UniqueIdentifier | null>(null);
  const [targetApp, setTargetApp] = useState<Business | null>(null);

  // Sensors for drag and drop (we need to enable long press for mobile)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Delay drag activation by 250ms to enable long press
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Find the active item for the drag overlay
  const activeItem = activeId ? findItem(activeId, businesses, folders) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setDragOverId(event.over?.id || null);

    // Find the target app when dragging over another app in all apps section
    if (isAllApps && event.over && activeId) {
      const targetAppId = event.over.id as string;
      const foundTargetApp = businesses.find((b) => b._?.soul === targetAppId);
      setTargetApp(foundTargetApp || null);
    } else {
      setTargetApp(null);
    }
  };
  // Custom collision detection to properly detect when dragging an app onto another app
  const customCollisionDetection: CollisionDetection = (args) => {
    // First, try to find collisions using pointerWithin
    const pointerCollisions = pointerWithin(args);

    // If there are pointer collisions, return the first one
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    // Otherwise, fall back to rectIntersection for overlapping detection
    return rectIntersection(args);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset active ID, drag over ID, and target app
    setActiveId(null);
    setDragOverId(null);
    setTargetApp(null);

    if (!over) return;

    // If dragging an app onto another app to create a folder (only in all apps section)
    if (
      isAllApps &&
      active.data?.current?.type === 'app' &&
      over.data?.current?.type === 'app' &&
      active.id !== over.id
    ) {
      // Create a new folder with these two apps
      const app1Id = active.id as string;
      const app2Id = over.id as string;

      createFolder('', [app1Id, app2Id]);
      return;
    }

    // If dragging an app onto a folder to add it
    if (
      isAllApps &&
      active.data?.current?.type === 'app' &&
      over.data?.current?.type === 'folder'
    ) {
      const appId = active.id as string;
      const folderId = over.id as string;

      // Find the folder and add the app to it
      const folder = folders.find((f) => f._?.soul === folderId);
      if (folder) {
        const updatedApps = { ...folder.apps, [appId]: true };
        updateFolder(folderId, { apps: updatedApps });
      }
      return;
    }

    // If dragging an app from a folder
    if (isAllApps && active.data?.current?.type === 'app-in-folder') {
      const appId = active.id as string;
      const sourceFolderId = active.data?.current?.folderId as string;

      // Do nothing if dropped back into the same folder area
      if (over.id === sourceFolderId) {
        return;
      }

      const sourceFolder = folders.find((f) => f._?.soul === sourceFolderId);
      if (!sourceFolder) return;

      // Remove app from source folder
      const updatedSourceApps = { ...sourceFolder.apps };
      delete updatedSourceApps[appId];

      const handleSourceFolderUpdate = () => {
        if (Object.keys(updatedSourceApps).length === 0) {
          deleteFolder(sourceFolderId);
        } else {
          updateFolder(sourceFolderId, { apps: updatedSourceApps });
        }
      };

      // Case 1: Dropped on a different folder
      if (over.data?.current?.type === 'folder' && over.id !== sourceFolderId) {
        const targetFolderId = over.id as string;
        const targetFolder = folders.find((f) => f._?.soul === targetFolderId);
        if (targetFolder) {
          const updatedTargetApps = { ...targetFolder.apps, [appId]: true };
          updateFolder(targetFolderId, { apps: updatedTargetApps });
        }
        handleSourceFolderUpdate();
      }
      // Case 2: Dropped on an app to create a new folder
      else if (over.data?.current?.type === 'app') {
        const app2Id = over.id as string;
        createFolder('', [appId, app2Id]);
        handleSourceFolderUpdate();
      }
      // Case 3: Dropped outside of any folder
      else if (!over.data?.current || over.data?.current?.type !== 'folder') {
        handleSourceFolderUpdate();
      }

      return;
    }
  };

  // Prepare items for drag and drop (businesses + folders)
  const items = [
    ...(allBusinessesForFolders || businesses).map((b) => b._?.soul || ''),
    ...folders.map((f) => f._?.soul || ''),
  ].filter((id) => id);
  const uniqueItems = [...new Set(items)];

  const noopSortingStrategy = () => null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`grid ${gridColumnClasses[gridColumns]} gap-4`}
        data-type="app-grid" // Mark this as the app grid for collision detection
      >
        <SortableContext items={uniqueItems} strategy={noopSortingStrategy}>
          {businesses.map((business) => (
            <BusinessIcon
              key={business._?.soul}
              business={business}
              iconSize={iconSize}
              addRecentlyUsedApp={addRecentlyUsedApp}
              isAllApps={isAllApps}
              targetApp={targetApp}
              activeItem={activeItem}
            />
          ))}
          {isAllApps &&
            folders.map((folder) => (
              <FolderIconComponent
                key={folder._?.soul}
                folder={folder}
                businesses={allBusinessesForFolders || businesses}
                iconSize={iconSize}
                isAllApps={isAllApps}
                onUpdateFolder={updateFolder}
                onDeleteFolder={deleteFolder}
                addRecentlyUsedApp={addRecentlyUsedApp}
              />
            ))}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeItem ? (
          // Check if we're dragging an app over another app to create a folder
          isAllApps && targetApp && activeItem.type === 'app' ? (
            // Don't show any preview when dragging app over app (will be handled by target app visual change)
            <div className="hidden" />
          ) : // Default case - normal drag overlay (show original app being dragged)
          activeItem.type === 'app' || activeItem.type === 'app-in-folder' ? (
            <div className="flex flex-col items-center pointer-events-none">
              <div
                className={`${getIconSizeClass(iconSize)} rounded-md bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0`}
              >
                {activeItem.item.icon ? (
                  <img
                    src={activeItem.item.icon}
                    alt={activeItem.item.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <AppWindow className="h-1/2 w-1/2 text-primary" />
                )}
              </div>
              <span className="text-sm mt-1">{activeItem.item.name}</span>
            </div>
          ) : activeItem.type === 'folder' ? (
            <div className="flex flex-col items-center pointer-events-none">
              <div
                className={`${getIconSizeClass(iconSize)} rounded-md bg-primary/20 border border-primary/50 flex items-center justify-center flex-shrink-0`}
              >
                <FolderIcon className="h-1/2 w-1/2 text-primary" />
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {
                    (allBusinessesForFolders || businesses).filter(
                      (b) => b._?.soul && activeItem.item.apps?.[b._?.soul],
                    ).length
                  }
                </div>
              </div>
              <span className="text-sm mt-1">
                {activeItem.item.name || 'Folder'}
              </span>
            </div>
          ) : null
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Helper function to get icon size class
function getIconSizeClass(iconSize: 'sm' | 'md' | 'lg') {
  const iconSizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  return iconSizeClasses[iconSize];
}

// Sortable Business Icon Component
interface SortableBusinessIconProps {
  business: Business;
  iconSize: 'sm' | 'md' | 'lg';
  addRecentlyUsedApp: (businessId: string) => Promise<void>;
  isAllApps?: boolean;
  targetApp?: Business | null; // Add targetApp prop
  activeItem?: ReturnType<typeof findItem> | null; // Add activeItem prop
}

function SortableBusinessIcon({
  business,
  iconSize,
  addRecentlyUsedApp,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  isAllApps = false,
  targetApp,
  activeItem,
}: SortableBusinessIconProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    // biome-ignore lint/correctness/noUnusedVariables: lint debt cleanup
    isDragging,
  } = useSortable({
    id: business._?.soul || '',
    data: {
      type: 'app',
    },
  });

  const icon = getAppIcon(business);
  const [imageError, setImageError] = useState(false);

  const iconSizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check if this business is the current drag target, but not the item being dragged
  const isDragTarget =
    targetApp?._?.soul === business._?.soul &&
    activeItem?.type === 'app' &&
    activeItem?.item?._?.soul !== business._?.soul;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col items-center"
      {...listeners}
      {...attributes}
    >
      <Link
        to="/$businessName/{-$subdomain}"
        params={{ businessName: business.basePath ?? '', subdomain: 'index' }}
        className="flex flex-col items-center"
        onClick={() => {
          if (business._?.soul) {
            addRecentlyUsedApp(business._.soul);
          }
        }}
      >
        {isDragTarget ? (
          // Show folder preview when this app is the target of a drag operation
          <div
            className={`${iconSizeClasses[iconSize]} rounded-full bg-primary/30 border-2 border-dashed border-primary/70 flex items-center justify-center flex-shrink-0 relative overflow-hidden`}
          >
            <div className="flex w-full h-full p-1">
              {/* Show both apps in the folder preview */}
              {activeItem && (
                <>
                  {/* Active item (being dragged) */}
                  <div className="w-1/2 h-full flex items-center justify-center pr-0.5">
                    {activeItem.item.icon ? (
                      <img
                        src={activeItem.item.icon}
                        alt={activeItem.item.name}
                        className="w-full h-full object-contain rounded-sm"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center rounded-sm">
                        <AppWindow className="h-1/2 w-1/2 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Target app */}
                  <div className="w-1/2 h-full flex items-center justify-center pl-0.5">
                    {icon && !imageError ? (
                      <img
                        src={icon}
                        alt={business.name}
                        className="w-full h-full object-contain rounded-sm"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center rounded-sm">
                        <AppWindow className="h-1/2 w-1/2 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {/* Show folder indicator */}
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
              +
            </div>
          </div>
        ) : icon && !imageError ? (
          <div
            className={`${iconSizeClasses[iconSize]} rounded-md overflow-hidden flex items-center justify-center flex-shrink-0`}
          >
            <img
              src={icon}
              alt={business.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div
            className={`${iconSizeClasses[iconSize]} rounded-md bg-muted flex items-center justify-center flex-shrink-0`}
          >
            <AppWindow className="h-1/2 w-1/2 text-muted-foreground" />
          </div>
        )}
        <span>{business.name}</span>
      </Link>
    </div>
  );
}

// Business Icon Component (wrapper for the sortable version)
function BusinessIcon({
  business,
  iconSize,
  addRecentlyUsedApp,
  isAllApps = false,
  targetApp,
  activeItem,
}: SortableBusinessIconProps) {
  return (
    <SortableBusinessIcon
      business={business}
      iconSize={iconSize}
      addRecentlyUsedApp={addRecentlyUsedApp}
      isAllApps={isAllApps}
      targetApp={targetApp}
      activeItem={activeItem}
    />
  );
}

// Sortable Folder Component
interface FolderIconComponentProps {
  folder: Folder;
  businesses: Business[];
  iconSize: 'sm' | 'md' | 'lg';
  isAllApps?: boolean;
  onUpdateFolder: (folderId: string, updates: Partial<Folder>) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  addRecentlyUsedApp: (businessId: string) => Promise<void>;
}

function SortableFolderIconComponent({
  folder,
  businesses,
  iconSize,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  isAllApps = false,
  onUpdateFolder,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  onDeleteFolder,
  addRecentlyUsedApp,
}: FolderIconComponentProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: folder._?.soul || '',
      data: {
        type: 'folder',
      },
    });

  const iconSizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const folderApps = businesses.filter(
    (b) => b._?.soul && folder.apps?.[b._?.soul],
  );

  const previewApps = folderApps.slice(0, 4);

  function _noopSortingStrategy() {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col items-center"
      {...attributes}
    >
      <AndroidFolder>
        <AndroidFolderTrigger>
          <div className="flex flex-col items-center">
            <button
              type="button"
              {...listeners}
              className={`${iconSizeClasses[iconSize]} rounded-md bg-muted flex items-center justify-center flex-shrink-0 cursor-pointer relative`}
            >
              {' '}
              <FolderIcon className="h-1/2 w-1/2 text-muted-foreground" />
              <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs z-10">
                {folderApps.length}
              </div>{' '}
              {previewApps.length > 0 && (
                <div className="absolute inset-0 flex flex-wrap overflow-hidden p-0.5 rounded-md">
                  {previewApps.map((app) => {
                    const icon = getAppIcon(app);
                    return (
                      <div
                        key={app._?.soul}
                        className="flex-1 min-w-[50%] min-h-[50%] p-px"
                      >
                        {icon ? (
                          <div className="w-full h-full overflow-hidden rounded-sm">
                            <img
                              src={icon}
                              alt={app.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-muted rounded-sm flex items-center justify-center">
                            <AppWindow className="h-1/2 w-1/2 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </button>
            <Editable
              value={folder.name || ''}
              onSubmit={(newValue) =>
                folder._?.soul &&
                onUpdateFolder(folder._?.soul, { name: newValue })
              }
              placeholder="Folder name"
              className="w-full mt-1"
              onClick={(e) => e.stopPropagation()}
            >
              {' '}
              <EditablePreview className="w-full truncate text-center" />
              <EditableInput className="w-full text-center" />
            </Editable>
          </div>
        </AndroidFolderTrigger>
        <AndroidFolderContent className="w-72 z-20 p-4">
          <div className="flex items-center mb-4">
            <FolderIcon className="mr-2 h-5 w-5" />
            <Editable
              value={folder.name || ''}
              onSubmit={(newValue) =>
                folder._?.soul &&
                onUpdateFolder(folder._?.soul, { name: newValue })
              }
              placeholder="Folder name"
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              {' '}
              <EditablePreview className="text-lg font-bold" />
              <EditableInput className="text-lg font-bold" />
            </Editable>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {folderApps.map(
              (app) =>
                folder._?.soul && (
                  <FolderAppIcon
                    key={app._?.soul}
                    app={app}
                    iconSize="sm"
                    folderId={folder._?.soul}
                    addRecentlyUsedApp={addRecentlyUsedApp}
                  />
                ),
            )}
          </div>
        </AndroidFolderContent>
      </AndroidFolder>
    </div>
  );
}

// Folder App Icon Component (for apps inside a folder)
interface FolderAppIconProps {
  app: Business;
  iconSize: 'sm' | 'md' | 'lg';
  folderId: string;
  addRecentlyUsedApp: (businessId: string) => Promise<void>;
}

function FolderAppIcon({
  app,
  iconSize,
  folderId,
  addRecentlyUsedApp,
}: FolderAppIconProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: app._?.soul || '',
    data: {
      type: 'app-in-folder',
      folderId: folderId,
    },
  });

  const icon = getAppIcon(app);
  const [imageError, setImageError] = useState(false);

  const iconSizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  };

  return (
    <Link
      ref={setNodeRef}
      style={style}
      to="/$businessName/{-$subdomain}"
      params={{ businessName: app.basePath ?? '', subdomain: 'index' }}
      className="flex flex-col items-center"
      onClick={(e) => {
        if (isDragging) {
          e.preventDefault();
          return;
        }
        if (app._?.soul) {
          addRecentlyUsedApp(app._.soul);
        }
      }}
      {...listeners}
      {...attributes}
    >
      {icon && !imageError ? (
        <div
          className={`${iconSizeClasses[iconSize]} rounded-md overflow-hidden flex items-center justify-center flex-shrink-0`}
        >
          <img
            src={icon}
            alt={app.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div
          className={`${iconSizeClasses[iconSize]} rounded-md bg-muted flex items-center justify-center flex-shrink-0`}
        >
          <AppWindow className="h-1/2 w-1/2 text-muted-foreground" />
        </div>
      )}
      <span className="text-xs mt-1 text-center truncate w-full">
        {app.name}
      </span>
    </Link>
  );
}

// Folder Icon Component (wrapper for the sortable version)
function FolderIconComponent(props: FolderIconComponentProps) {
  return <SortableFolderIconComponent {...props} />;
}

export const AppGrid = memo(AppGridComponent);
