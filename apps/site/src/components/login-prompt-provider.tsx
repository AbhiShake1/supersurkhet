import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Credenza, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle } from "@/components/ui/credenza";
import { AuthForm } from "@/components/auth-form";
import type { User } from "@/lib/schema";
import { useAuth } from "./auth-provider";
import { ScrollArea } from "./ui/scroll-area";

interface LoginPromptContextType {
  promptLogin: (options?: { dismissible?: boolean }) => Promise<User | undefined>;
  closeLoginPrompt: () => void;
}

const LoginPromptContext = createContext<LoginPromptContextType | undefined>(undefined);

export const LoginPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, _setIsOpen] = useState(false);
  const resolveRef = useRef<(user: User) => void>(null);
  const rejectRef = useRef<(error: Error) => void>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const { user } = useAuth()
  const [isDismissible, setIsDismissible] = useState(true);
  function setIsOpen(open: boolean, { force = false } = {}) {
    if (force) return _setIsOpen(open)
    if (!open && !isDismissible) return _setIsOpen(true)
    _setIsOpen(open)
  }

  const promptLogin = useCallback(({ dismissible = true }: { dismissible?: boolean } = {}) => {
    if (!!user) return Promise.resolve(user);
    setIsDismissible(dismissible);
    setIsOpen(true);
    setMode("login"); // Always start with login mode
    return new Promise<User>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
    });
  }, [user]);

  const handleAuthSuccess = useCallback((user: User) => {
    setIsOpen(false);
    resolveRef.current?.(user);
  }, []);

  const handleAuthError = useCallback((error: Error) => {
    // setIsOpen(false);
    rejectRef.current?.(error);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // If the dialog is closed without successful login, reject the promise
      rejectRef.current?.(new Error("Login process cancelled."));
    }
  }, []);

  function closeLoginPrompt() {
    setIsOpen(false, { force: true })
  }

  return (
    <LoginPromptContext.Provider value={{ promptLogin, closeLoginPrompt }}>
      {children}
      <Credenza open={isOpen} onOpenChange={handleOpenChange}>
        <CredenzaContent hideClose={!isDismissible}>
          <CredenzaHeader>
            <CredenzaTitle>{mode === "login" ? "Sign In" : "Create Account"}</CredenzaTitle>
            <CredenzaDescription>
              {mode === "login" ? "Please sign in to continue." : "Create an account to get started."}
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
                className: "hidden"
              }}
              headerWrapperProps={{
                className: "p-0"
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
    console.error("useLoginPrompt must be used within a LoginPromptProvider");
    return {
      closeLoginPrompt: () => { },
      promptLogin: async () => {
        return undefined
      },
    }
  }
  return context;
};
