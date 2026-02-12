import { useAuth } from '@/components/auth-provider';
import { api } from '@/lib/api';
import type { NestedSchemaType } from '@gta/react-hooks';
import { createContext, useContext, useMemo } from 'react';

export type Folder = NestedSchemaType<'folder'>;

interface FoldersContextType {
  folders: Folder[];
  createFolder: (name: string, appIds: string[]) => Promise<void>;
  updateFolder: (folderId: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  isLoading: boolean;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

export function FoldersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const userId = user?._?.soul?.split('.')[1] || '';

  const { data: fetchedFolders = [], isLoading } = api.folder.useGet({
    keys: [userId],
  });

  const createFolderMutation = api.folder.useCreate({ keys: [userId] });
  const updateFolderMutation = api.folder.useUpdate();
  const deleteFolderMutation = api.folder.useDelete();

  // Filter folders by current user
  const userFolders = useMemo(() => {
    if (!fetchedFolders?.length) return [];
    return fetchedFolders.filter((folder) => folder.userId === userId);
  }, [fetchedFolders, userId]);

  const createFolder = async (name: string, appIds: string[]) => {
    if (!userId) return;

    const apps = appIds.reduce(
      (acc, appId) => {
        acc[appId] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );

    try {
      await createFolderMutation.mutateAsync({
        name,
        apps,
        userId,
        created_by: user?._?.soul ?? 'anon',
      });
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const updateFolder = async (folderId: string, updates: Partial<Folder>) => {
    try {
      await updateFolderMutation.mutateAsync({
        id: folderId,
        ...updates,
      });
    } catch (error) {
      console.error('Error updating folder:', error);
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      await deleteFolderMutation.mutateAsync(folderId);
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  return (
    <FoldersContext.Provider
      value={{
        folders: userFolders,
        createFolder,
        updateFolder,
        deleteFolder,
        isLoading,
      }}
    >
      {children}
    </FoldersContext.Provider>
  );
}

export function useFolders() {
  const context = useContext(FoldersContext);
  if (context === undefined) {
    throw new Error('useFolders must be used within a FoldersProvider');
  }
  return context;
}
