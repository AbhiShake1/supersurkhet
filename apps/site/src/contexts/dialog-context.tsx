import React, {
  createContext,
  type ReactNode,
  useContext,
  useState,
} from 'react';
import { CredenzaBody } from '@/components/ui/credenza';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

type DialogContentProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  showCloseButton?: boolean; // Option to hide the close button
  className?: string;
};

type DialogContextType = {
  openDialog: (content: DialogContentProps) => void;
  closeDialog: () => void;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = (): DialogContextType => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

type DialogProviderProps = {
  children: ReactNode;
};

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<DialogContentProps | null>(
    null,
  );

  const openDialog = (content: DialogContentProps) => {
    setDialogContent(content);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setDialogContent(null);
  };

  return (
    <DialogContext.Provider value={{ openDialog, closeDialog }}>
      {children}
      {dialogContent && (
        <Dialog open={isOpen} onOpenChange={closeDialog}>
          <DialogContent
            hideClose={!dialogContent.showCloseButton}
            className={dialogContent.className}
          >
            {(dialogContent.title || dialogContent.description) && (
              <DialogHeader>
                {dialogContent.title && (
                  <DialogTitle>{dialogContent.title}</DialogTitle>
                )}
                {dialogContent.description && (
                  <DialogDescription>
                    {dialogContent.description}
                  </DialogDescription>
                )}
              </DialogHeader>
            )}
            {dialogContent.children}
          </DialogContent>
        </Dialog>
      )}
    </DialogContext.Provider>
  );
};

const drawerContext = React.createContext<DialogContextType | undefined>(
  undefined,
);

export const DrawerProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<DialogContentProps | null>(
    null,
  );

  const openDialog = (content: DialogContentProps) => {
    setDialogContent(content);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setDialogContent(null);
  };

  return (
    <drawerContext.Provider value={{ openDialog, closeDialog }}>
      {children}
      {dialogContent && (
        <Drawer open={isOpen} onOpenChange={closeDialog}>
          <DrawerContent className={dialogContent.className}>
            {(dialogContent.title || dialogContent.description) && (
              <DialogHeader>
                {dialogContent.title && (
                  <DialogTitle>{dialogContent.title}</DialogTitle>
                )}
                {dialogContent.description && (
                  <DialogDescription>
                    {dialogContent.description}
                  </DialogDescription>
                )}
              </DialogHeader>
            )}
            {dialogContent.children && (
              <CredenzaBody className="mx-4">
                {dialogContent.children}
              </CredenzaBody>
            )}
          </DrawerContent>
        </Drawer>
      )}
    </drawerContext.Provider>
  );
};

export const useDrawer = () => {
  const context = useContext(drawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
};
