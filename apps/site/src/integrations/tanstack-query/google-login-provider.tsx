import { useAuth } from "@/components/auth-provider";
import { googleLogin } from "@/lib/auth";
import { GoogleOAuthProvider, useGoogleOneTapLogin } from "@react-oauth/google";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function GoogleLoginProvider({ children }: React.PropsWithChildren) {
	return (
		<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID}>
			{children}
		</GoogleOAuthProvider>
	);
}

export function OneTapLoginProvider({ children }: React.PropsWithChildren) {
	const { isAuthenticated } = useAuth();
	if (!!isAuthenticated) return children;
	return <_OneTapLoginProvider>{children}</_OneTapLoginProvider>;
}

function _OneTapLoginProvider({ children }: React.PropsWithChildren) {
	const { refreshUser } = useAuth();
	const googleLoginMutation = useMutation({
		mutationFn: googleLogin,
		onSuccess: () => {
			refreshUser();
		},
		onError: (err) => {
			toast.error(err.message);
		},
	});

	useGoogleOneTapLogin({
		onSuccess: async (credentialResponse) => {
			// console.log({ credentialResponse })
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
			toast.error("Login Failed");
		},
	});

	return children;
}
