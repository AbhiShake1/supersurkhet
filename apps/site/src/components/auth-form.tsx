import { Logo } from "@/components/logo";
import { AutoForm } from "@/components/ui/autoform";
import { SubmitButton } from "@/components/ui/autoform/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { gun } from "@/lib/gun";
import { pixelArt } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "./auth-provider";

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

interface AuthFormProps {
  mode: "login" | "signup";
  onModeChange: (mode: "login" | "signup") => void;
  onAuthSuccess?: (user: any) => void; // Callback for successful authentication
  onAuthError?: (error: Error) => void; // Callback for authentication errors
}

export function AuthForm({ mode, onModeChange, onAuthSuccess, onAuthError }: AuthFormProps) {
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

  return (
    <div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border px-4 shadow-md dark:[--color-muted:var(--color-zinc-900)]">
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
            <Button asChild variant="link" className="px-2">
              <a onClick={() => {
                setError("")
                onModeChange("login")
              }}>Sign in</a>
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
            <Button asChild variant="link" className="px-2">
              <a onClick={() => {
                setError("")
                onModeChange("signup")
              }}>Create account</a>
            </Button>
          </p>
        </AutoForm>
      )}
    </div>
  );
}
