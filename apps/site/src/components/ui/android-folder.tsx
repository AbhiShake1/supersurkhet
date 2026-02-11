'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// --- Context Definition ---
interface FolderContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  position: { x: number; y: number };
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  folderRef: React.RefObject<HTMLDivElement>;
  overlayRef: React.RefObject<HTMLDivElement>;
}

const FolderContext = React.createContext<FolderContextType | null>(null);

const useFolderContext = () => {
  const context = React.useContext(FolderContext);
  if (!context) {
    throw new Error('useFolderContext must be used within an AndroidFolder');
  }
  return context;
};

// --- Root Component ---
const AndroidFolder = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const folderRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        overlayRef.current &&
        !overlayRef.current.contains(event.target as Node) &&
        folderRef.current &&
        !folderRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <FolderContext.Provider
      value={{
        isOpen,
        setIsOpen,
        position,
        setPosition,
        folderRef,
        overlayRef,
      }}
    >
      {children}
    </FolderContext.Provider>
  );
};

// --- Trigger Component ---
const AndroidFolderTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  const { setIsOpen, setPosition, folderRef } = useFolderContext();

  const calculateOptimalPosition = () => {
    if (!folderRef.current) return { x: 0, y: 0 };

    const folderRect = folderRef.current.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const overlayWidth = 320;
    const overlayHeight = 300;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = folderRect.left + scrollX + folderRect.width / 2;
    let y = folderRect.top + scrollY + folderRect.height / 2;

    const halfOverlayWidth = overlayWidth / 2;
    const leftEdge = x - halfOverlayWidth;
    const rightEdge = x + halfOverlayWidth;

    if (leftEdge < scrollX) {
      x = scrollX + halfOverlayWidth + 16;
    } else if (rightEdge > scrollX + viewportWidth) {
      x = scrollX + viewportWidth - halfOverlayWidth - 16;
    }

    const halfOverlayHeight = overlayHeight / 2;
    const topEdge = y - halfOverlayHeight;
    const bottomEdge = y + halfOverlayHeight;

    if (topEdge < scrollY) {
      y = scrollY + halfOverlayHeight + 16;
    } else if (bottomEdge > scrollY + viewportHeight) {
      y = scrollY + viewportHeight - halfOverlayHeight - 16;
    }

    return { x, y };
  };

  const handleFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const optimalPosition = calculateOptimalPosition();
    setPosition(optimalPosition);
    setIsOpen(true);
  };

  const setRefs = React.useCallback(
    (node: HTMLDivElement) => {
      (folderRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [folderRef, ref],
  );

  return (
    <div
      ref={setRefs}
      onClick={handleFolderClick}
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  );
});
AndroidFolderTrigger.displayName = 'AndroidFolderTrigger';

// --- Content Component ---
const AndroidFolderContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  const { isOpen, position, overlayRef } = useFolderContext();

  const setRefs = React.useCallback(
    (node: HTMLDivElement) => {
      (overlayRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [overlayRef, ref],
  );

  if (typeof document === 'undefined' || !isOpen) return null;

  return createPortal(
    <div
      ref={setRefs}
      className={cn(
        'fixed z-50 bg-popover border border-border rounded-3xl shadow-2xl p-6 min-w-80',
        className,
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        animation: 'folder-expand 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
});
AndroidFolderContent.displayName = 'AndroidFolderContent';

export { AndroidFolder, AndroidFolderTrigger, AndroidFolderContent };
