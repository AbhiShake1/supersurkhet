import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Credenza, CredenzaContent, CredenzaDescription, CredenzaHeader, CredenzaTitle } from "@/components/ui/credenza";
import { AuthForm } from "@/components/auth-form";
import type { User } from "@/lib/schema";
import { useAuth } from "./auth-provider";

interface LoginPromptContextType {
  promptLogin: () => Promise<User>;
}

const LoginPromptContext = createContext<LoginPromptContextType | undefined>(undefined);

export const LoginPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const resolveRef = useRef<(user: User) => void>(null);
  const rejectRef = useRef<(error: Error) => void>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const { user } = useAuth()

  const promptLogin = useCallback(() => {
    if (!!user) return Promise.resolve(user);
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

  return (
    <LoginPromptContext.Provider value={{ promptLogin }}>
      {children}
      <Credenza open={isOpen} onOpenChange={handleOpenChange}>
        <CredenzaContent>
          <CredenzaHeader>
            <CredenzaTitle>{mode === "login" ? "Sign In" : "Create Account"}</CredenzaTitle>
            <CredenzaDescription>
              {mode === "login" ? "Please sign in to continue." : "Create an account to get started."}
            </CredenzaDescription>
          </CredenzaHeader>
          <AuthForm
            mode={mode}
            onModeChange={setMode}
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
          />
        </CredenzaContent>
      </Credenza>
    </LoginPromptContext.Provider>
  );
};

export const useLoginPrompt = () => {
  const context = useContext(LoginPromptContext);
  if (context === undefined) {
    throw new Error("useLoginPrompt must be used within a LoginPromptProvider");
  }
  return context;
};
