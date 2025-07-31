import { Logo } from "@/components/logo";
import { AutoForm } from "@/components/ui/autoform";
import { SubmitButton } from "@/components/ui/autoform/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { googleLogin } from "@/lib/auth";
import { gun } from "@/lib/gun";
import { pixelArt } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import {
  useGoogleLogin
} from "@react-oauth/google";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "./auth-provider";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

interface AuthFormProps extends React.ComponentProps<"div"> {
  mode: "login" | "signup";
  onModeChange: (mode: "login" | "signup") => void;
  onAuthSuccess?: (user: any) => void; // Callback for successful authentication
  onAuthError?: (error: Error) => void; // Callback for authentication errors
}

export function AuthForm({
  mode,
  onModeChange,
  onAuthSuccess,
  onAuthError,
  className,
  ...props
}: AuthFormProps) {
  const isSignup = mode === "signup";
  const [error, setError] = useState("");
  const { refreshUser } = useAuth();

  const signupMutation = useMutation({
    mutationFn: async ({ email, password }: z.infer<typeof signupSchema>) => {
      const alias = email?.toLowerCase();
      const userExists = await new Promise((resolve) => {
        gun.get("~@" + alias).once((data) => resolve(!!data));
      });
      if (userExists) {
        throw new Error("This email is already registered");
      }
      return new Promise((resolve, reject) => {
        gun.user().create(alias, password, (ack) => {
          if ("err" in ack) return reject(new Error(ack.err));

          const userProfile = {
            email: alias,
            role: "user",
            isActive: true,
            avatar: createAvatar(pixelArt).toDataUri(),
            phone: "",
            permissions: {},
          };
          // console.log(ack)
          gun.get("user").get(ack.pub).put(userProfile);
          resolve("created");
        });
      });
    },
    onSuccess: () => {
      refreshUser();
      setError("");
      onModeChange("login");
    },
    onError: (err) => {
      setError(err.message);
      onAuthError?.(err);
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: z.infer<typeof loginSchema>) => {
      const alias = email?.toLowerCase();
      return new Promise((resolve, reject) => {
        gun.user().auth(alias, password, (ack) => {
          if ("err" in ack && ack.err) return reject(new Error(ack.err));
          resolve(gun.user().is); // Return the authenticated user object
        });
      });
    },
    onSuccess: (user) => {
      refreshUser();
      onAuthSuccess?.(user);
    },
    onError: (err) => {
      setError(err.message);
      onAuthError?.(err);
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: googleLogin,
    onSuccess: (user) => {
      refreshUser();
      onAuthSuccess?.(user);
    },
    onError: (err) => {
      setError(err.message);
      onAuthError?.(err);
    },
  });

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${codeResponse.access_token}`
      );
      const data = await res.json();
      googleLoginMutation.mutate({
        email: data.email,
        name: data.name,
        avatar: data.picture,
      });
    },
    onError: () => {
      toast.error("Login Failed");
    },
  });

  return (
    <div className={cn(
      "bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border px-4 shadow-md dark:[--color-muted:var(--color-zinc-900)]",
      className,
    )} {...props}>
      <div className="p-8 pb-6">
        <div>
          <a href="/" aria-label="go home">
            <Logo />
          </a>
          <h1 className="mb-1 mt-4 text-xl font-semibold">
            {isSignup ? "Create your account" : "Sign In to Surkhet"}
          </h1>
          <p className="text-sm">
            {isSignup
              ? "Get started with your free account"
              : "Welcome back! Sign in to continue"}
          </p>
        </div>
        <hr className="my-4 border-dashed" />
        {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      </div>
      <div className="grid gap-6">
        <div className="flex flex-col gap-4">
          {
            // <Button variant="outline" className="w-full">
            //   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4 mr-2">
            //     <path
            //       d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
            //       fill="currentColor"
            //     />
            //   </svg>
            //   Login with Apple
            // </Button>
          }
          <Button
            variant="outline"
            className="w-full"
            onClick={() => loginWithGoogle()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="size-4 mr-2"
            >
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Login with Google
          </Button>
        </div>
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-card text-muted-foreground relative z-10 px-2">
            Or continue with
          </span>
        </div>
        {isSignup ? (
          <AutoForm
            schema={signupSchema}
            onSubmit={(v) => signupMutation.mutate(v)}
          >
            <SubmitButton className="w-full" loading={signupMutation.isPending}>
              Create Account
            </SubmitButton>
            <p className="text-accent-foreground text-center text-sm pb-2">
              Already have an account?
              <Button
                asChild
                variant="link"
                className="px-2"
              >
                <a
                  onClick={() => {
                    setError("");
                    onModeChange("login");
                  }}
                >
                  Sign in
                </a>
              </Button>
            </p>
          </AutoForm>
        ) : (
          <AutoForm
            schema={loginSchema}
            onSubmit={(v) => loginMutation.mutate(v)}
          >
            <SubmitButton className="w-full" loading={loginMutation.isPending}>
              Sign In
            </SubmitButton>
            <p className="text-accent-foreground text-center text-sm pb-2">
              Don't have an account yet?
              <Button
                asChild
                variant="link"
                className="px-2"
              >
                <a
                  onClick={() => {
                    setError("");
                    onModeChange("signup");
                  }}
                >
                  Create account
                </a>
              </Button>
            </p>
          </AutoForm>
        )}
      </div>
    </div>
  );
}

