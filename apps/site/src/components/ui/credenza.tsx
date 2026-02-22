import * as React from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface BaseProps {
  children: React.ReactNode;
}

interface RootCredenzaProps extends BaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface CredenzaProps extends BaseProps {
  className?: string;
  asChild?: true;
}

const CredenzaContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
});

const useCredenzaContext = () => {
  const context = React.useContext(CredenzaContext);
  if (!context) {
    throw new Error(
      'Credenza components cannot be rendered outside the Credenza Context',
    );
  }
  return context;
};

const Credenza = ({ children, ...props }: RootCredenzaProps) => {
  const isMobile = useIsMobile();
  const Credenza = isMobile ? Drawer : Dialog;

  return (
    <CredenzaContext.Provider value={{ isMobile }}>
      <Credenza
        {...props}
        {...(isMobile && { autoFocus: true, shouldScaleBackground: true })}
      >
        {children}
      </Credenza>
    </CredenzaContext.Provider>
  );
};

const CredenzaTrigger = ({ className, children, ...props }: CredenzaProps) => {
  const { isMobile } = useCredenzaContext();
  const CredenzaTrigger = isMobile ? DrawerTrigger : DialogTrigger;

  return (
    <CredenzaTrigger className={className} {...props}>
      {children}
    </CredenzaTrigger>
  );
};

const CredenzaClose = ({ className, children, ...props }: CredenzaProps) => {
  const { isMobile } = useCredenzaContext();
  const CredenzaClose = isMobile ? DrawerClose : DialogClose;

  return (
    <CredenzaClose className={className} {...props}>
      {children}
    </CredenzaClose>
  );
};

const CredenzaContent = ({
  className,
  children,
  hideClose,
  ...props
}: CredenzaProps & { hideClose?: boolean }) => {
  const { isMobile } = useCredenzaContext();
  const mergedClassName = cn(
    isMobile &&
      'fixed inset-x-0 bottom-0 top-auto mt-auto rounded-t-xl border-t max-h-[90vh]',
    className,
  );

  if (isMobile) {
    return (
      <DrawerContent className={mergedClassName} {...props}>
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={mergedClassName} hideClose={hideClose} {...props}>
      {children}
    </DialogContent>
  );
};

const CredenzaDescription = ({
  className,
  children,
  ...props
}: CredenzaProps) => {
  const { isMobile } = useCredenzaContext();
  const CredenzaDescription = isMobile ? DrawerDescription : DialogDescription;

  return (
    <CredenzaDescription className={className} {...props}>
      {children}
    </CredenzaDescription>
  );
};

const CredenzaHeader = ({ className, children, ...props }: CredenzaProps) => {
  const { isMobile } = useCredenzaContext();
  const CredenzaHeader = isMobile ? DrawerHeader : DialogHeader;

  return (
    <CredenzaHeader
      className={cn(isMobile && 'pt-4 pb-2', className)}
      {...props}
    >
      {children}
    </CredenzaHeader>
  );
};

const CredenzaTitle = ({ className, children, ...props }: CredenzaProps) => {
  const { isMobile } = useCredenzaContext();
  const CredenzaTitle = isMobile ? DrawerTitle : DialogTitle;

  return (
    <CredenzaTitle className={className} {...props}>
      {children}
    </CredenzaTitle>
  );
};

const CredenzaBody = ({ className, children, ...props }: CredenzaProps) => {
  return (
    <div className={cn('px-4 md:px-0', className)} {...props}>
      {children}
    </div>
  );
};

const CredenzaFooter = ({ className, children, ...props }: CredenzaProps) => {
  const { isMobile } = useCredenzaContext();
  const CredenzaFooter = isMobile ? DrawerFooter : DialogFooter;

  return (
    <CredenzaFooter
      className={cn(isMobile && 'pb-4 pt-2', className)}
      {...props}
    >
      {children}
    </CredenzaFooter>
  );
};

export {
  Credenza,
  CredenzaTrigger,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaBody,
  CredenzaFooter,
};
