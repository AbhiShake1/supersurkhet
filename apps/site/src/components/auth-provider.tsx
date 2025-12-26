import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouteContext } from "@tanstack/react-router";
import type { User } from "@/lib/schema";
import { googleLogout } from "@react-oauth/google";
import { v4 as uuid } from "uuid"
import { createAvatar } from "@dicebear/core";
import { pixelArt } from "@dicebear/collection";
import type { IGunChain } from "gun/types";
import { getGunRef, mergeKeys } from "@/lib/gun/utils";
import _ from "lodash";

interface AuthContextType {
  user: User | undefined;
  setUser: (user: User | undefined) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUser: () => void;
  anonymousUserId: string | null;
  linkAnonymousUser: (authenticatedUser: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ANONYMOUS_USER_KEY = "supersurkhet_anonymous_user_id";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { auth } = useRouteContext({ from: "__root__" });
  const [user, setUser] = useState<User>();
  const [refreshState, setRefreshState] = useState(0);
  const [authUser, setAuthUser] =
    useState<Awaited<ReturnType<typeof auth.getCurrentUser>>>();
  const [anonymousUserId, setAnonymousUserId] = useState<string | null>(null);

  // Initialize anonymous user ID
  useEffect(() => {
    // Check if we already have an anonymous user ID in localStorage
    const storedAnonymousId = localStorage.getItem(ANONYMOUS_USER_KEY);
    let userId = storedAnonymousId;

    // If no stored ID, generate a new one
    if (!storedAnonymousId) {
      userId = uuid();
      if (userId) localStorage.setItem(ANONYMOUS_USER_KEY, userId);
    }

    if (userId) {
      setAnonymousUserId(userId);
    }
  }, []);

  function refreshUser() {
    setRefreshState((r) => r + 1);
  }

  // Handle authentication state and user data
  useEffect(() => {
    let ref: IGunChain<any>;
    auth.getCurrentUser().then((_authUser) => {
      setAuthUser(_authUser);

      // If we have an authenticated user, use that
      if (_authUser) {
        ref = getGunRef(mergeKeys("user"))
          .get(_authUser.pub)
          .open((data) => {
            setUser({ ..._authUser, ...data });
          });

        // If no authenticated user but we have an anonymous user ID
        if (anonymousUserId) {
          ref = getGunRef(mergeKeys("user"))
            .get(anonymousUserId)
            .open((data) => {
              setUser({
                pub: anonymousUserId,
                email: undefined,
                name: "Anonymous User",
                avatar: createAvatar(pixelArt).toDataUri(),
                ...data
              });
            });
        }
      }
    })

    return () => {
      ref?.off();
    }
  }, [refreshState, auth.getCurrentUser, anonymousUserId]);

  const isAuthenticated = useMemo(() => !!authUser, [authUser]);

  async function linkAnonymousUser(authenticatedUser: User) {
    function saveUser(anonymousData: any, onSaved?: () => void) {
      const mergedData = {
        ...authenticatedUser,
        ...anonymousData,
      };

      getGunRef(mergeKeys("user"))
        .get(authenticatedUser.pub)
        .put(mergedData)

      setUser(mergedData);

      // Clear the anonymous user ID from localStorage
      localStorage.removeItem(ANONYMOUS_USER_KEY);

      // Update the anonymousUserId state
      setAnonymousUserId(null);

      onSaved?.()
    }
    return new Promise<void>((resolve) => {
      if (!anonymousUserId) {
        // If there's no anonymous user, just set the authenticated user
        setUser(authenticatedUser);
        resolve();
        return;
      }

      // Get data from the anonymous user node
      getGunRef(mergeKeys("user"))
        .get(anonymousUserId)
        .not(() => {
          saveUser({}, resolve)
          resolve()
        })
        .once((anonymousData) => {
          saveUser(anonymousData, resolve)
        });
    });
  }

  function logout() {
    auth.logout?.();
    setUser(undefined);
    googleLogout();
  }

  return (
    <AuthContext.Provider
      value={{
        user: user ? {
          ...user,
          _: _.pick(user._, ["soul", "id", "ing", "get", "rad"])
        } : user,
        setUser,
        logout,
        isAuthenticated,
        refreshUser,
        anonymousUserId,
        linkAnonymousUser
      }}
    >
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
