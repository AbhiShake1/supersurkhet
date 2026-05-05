import { useAuth } from '@/components/auth-provider';
import { googleLogin } from '@/lib/auth';
import { GoogleOAuthProvider, useGoogleOneTapLogin } from '@react-oauth/google';
import { useMutation } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { toast } from 'sonner';

const googleOauthClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? '';

export function GoogleLoginProvider({ children }: PropsWithChildren) {
  return googleOauthClientId.trim() ? (
    <GoogleOAuthProvider clientId={googleOauthClientId.trim()}>
      {children}
    </GoogleOAuthProvider>
  ) : (
    children
  );
}

export function OneTapLoginProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isAuthenticated || isLoading) return children;
  return <_OneTapLoginProvider>{children}</_OneTapLoginProvider>;
}

function _OneTapLoginProvider({ children }: PropsWithChildren) {
  const { refreshUser, linkAnonymousUser } = useAuth();
  const googleLoginMutation = useMutation({
    mutationFn: googleLogin,
    onSuccess: async (user, variables) => {
      if (user) {
        await linkAnonymousUser({ ...variables, ...user });
      }
      refreshUser();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  useGoogleOneTapLogin({
    onSuccess: async (credentialResponse) => {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${credentialResponse.credential}`,
      );
      const data = await res.json();
      googleLoginMutation.mutateAsync({
        email: data.email,
        name: data.name,
        avatar: data.picture,
      });
    },
    onError: () => {
      toast.error('Login Failed');
    },
  });

  return children;
}
