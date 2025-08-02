import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouteContext } from "@tanstack/react-router";
import type { User } from "@/lib/schema";
import { gun } from "@/lib/gun";
import { googleLogout } from "@react-oauth/google";

interface AuthContextType {
  user: User | undefined;
  setUser: (user: User | undefined) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth } = useRouteContext({ from: "__root__" });
  const [user, setUser] = useState<User>();
  const [refreshState, setRefreshState] = useState(0);

  function refreshUser() {
    setRefreshState(r => r + 1);
  }

  useEffect(() => {
    const user = auth.getCurrentUser();
    if (!user) return
    const ref = gun.get("user").get(user.pub).open((data) => {
      setUser(data)
    })
    return () => {
      ref.off()
    }
  }, [refreshState])

  const isAuthenticated = !!user;

  function logout() {
    auth.logout?.();
    setUser(undefined);
    googleLogout()
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isAuthenticated, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
