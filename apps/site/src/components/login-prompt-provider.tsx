import { DialogOverlay } from '@radix-ui/react-dialog';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AuthForm } from '@/components/auth-form';
import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
} from '@/components/ui/credenza';
import type { User } from '@/lib/schema';
import type { AuthUser } from './auth-provider';
import { useAuth } from './auth-provider';
import { ScrollArea } from './ui/scroll-area';

interface LoginPromptContextType {
  promptLogin: (options?: {
    dismissible?: boolean;
    showBackgroundContent?: boolean;
  }) => Promise<AuthUser | undefined>;
  closeLoginPrompt: () => void;
}

interface LoginPromptGuardState {
  enabled: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function resolveLoginPromptGuardAction({
  enabled,
  isAuthenticated,
  isLoading,
}: LoginPromptGuardState): 'prompt' | 'close' | 'noop' {
  if (!enabled) return 'close';
  if (isLoading) return 'noop';
  if (!isAuthenticated) return 'prompt';
  return 'close';
}

export function useLoginPromptGuard({
  enabled,
  isAuthenticated,
  isLoading,
  dismissible = false,
  showBackgroundContent = false,
}: LoginPromptGuardState & {
  dismissible?: boolean;
  showBackgroundContent?: boolean;
}) {
  const { promptLogin, closeLoginPrompt } = useLoginPrompt();
  const promptInFlightRef = useRef(false);

  useEffect(() => {
    const action = resolveLoginPromptGuardAction({
      enabled,
      isAuthenticated,
      isLoading,
    });

    if (action === 'close') {
      promptInFlightRef.current = false;
      closeLoginPrompt();
      return;
    }

    if (action === 'noop' || promptInFlightRef.current) {
      return;
    }

    promptInFlightRef.current = true;
    void promptLogin({
      dismissible,
      showBackgroundContent,
    }).finally(() => {
      promptInFlightRef.current = false;
    });

    return () => {
      promptInFlightRef.current = false;
      closeLoginPrompt();
    };
  }, [
    closeLoginPrompt,
    dismissible,
    enabled,
    isAuthenticated,
    isLoading,
    promptLogin,
    showBackgroundContent,
  ]);
}

const LoginPromptContext = createContext<LoginPromptContextType | undefined>(
  undefined,
);

export const LoginPromptProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, _setIsOpen] = useState(false);
  const resolveRef = useRef<((user: AuthUser | undefined) => void) | null>(
    null,
  );
  const rejectRef = useRef<((error: Error) => void) | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { user, isAuthenticated, isLoading } = useAuth();
  const isDismissibleRef = useRef(true);
  const showBackgroundContentRef = useRef(true);
  const setIsOpen = useCallback((open: boolean, { force = false } = {}) => {
    if (force) return _setIsOpen(open);
    if (!open && !isDismissibleRef.current) return _setIsOpen(true);
    _setIsOpen(open);
  }, []);

  const promptLogin = useCallback(
    ({
      dismissible = true,
      showBackgroundContent = true,
    }: {
      dismissible?: boolean;
      showBackgroundContent?: boolean;
    } = {}) => {
      if (isLoading) return Promise.resolve(undefined);
      if (isAuthenticated) return Promise.resolve(user);
      isDismissibleRef.current = dismissible;
      showBackgroundContentRef.current = showBackgroundContent;
      setIsOpen(true);
      setMode('login'); // Always start with login mode
      return new Promise<AuthUser | undefined>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;
      });
    },
    [user, isAuthenticated, setIsOpen, isLoading],
  );

  const handleAuthSuccess = useCallback(
    (user: User) => {
      resolveRef.current?.(user);
      resolveRef.current = null;
      rejectRef.current = null;
      setIsOpen(false);
    },
    [setIsOpen],
  );

  const handleAuthError = useCallback((error: Error) => {
    // setIsOpen(false);
    rejectRef.current?.(error);
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (!open) {
        resolveRef.current?.(undefined);
        resolveRef.current = null;
        rejectRef.current = null;
      }
    },
    [setIsOpen],
  );

  const closeLoginPrompt = useCallback(() => {
    setIsOpen(false, { force: true });
  }, [setIsOpen]);

  return (
    <LoginPromptContext.Provider value={{ promptLogin, closeLoginPrompt }}>
      {children}
      <Credenza open={isOpen} onOpenChange={handleOpenChange}>
        {!showBackgroundContentRef.current && (
          <DialogOverlay className="fixed inset-0 z-50 backdrop-blur-lg bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        )}
        <CredenzaContent hideClose={!isDismissibleRef.current}>
          <CredenzaHeader>
            <CredenzaTitle>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </CredenzaTitle>
            <CredenzaDescription>
              {mode === 'login'
                ? 'Please sign in to continue.'
                : 'Create an account to get started.'}
            </CredenzaDescription>
          </CredenzaHeader>
          <ScrollArea className="h-[60svh]">
            <AuthForm
              mode={mode}
              onModeChange={setMode}
              onAuthSuccess={handleAuthSuccess}
              onAuthError={handleAuthError}
              className="bg-transparent border-none shadow-none"
              headerProps={{
                className: 'hidden',
              }}
              headerWrapperProps={{
                className: 'p-0',
              }}
            />
          </ScrollArea>
        </CredenzaContent>
      </Credenza>
    </LoginPromptContext.Provider>
  );
};

export const useLoginPrompt = (): LoginPromptContextType => {
  const context = useContext(LoginPromptContext);
  if (!context) {
    console.error('useLoginPrompt must be used within a LoginPromptProvider');
    return {
      closeLoginPrompt: () => {},
      promptLogin: async () => {
        return undefined;
      },
    };
  }
  return context;
};
