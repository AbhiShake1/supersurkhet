import { Logo } from "@/components/logo";
import { AutoForm } from "@/components/ui/autoform";
import { SubmitButton } from "@/components/ui/autoform/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { gun } from "@/lib/gun";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

export const Route = createFileRoute("/_auth/auth")({
	component: RouteComponent,
	validateSearch: z.object({
		m: z.enum(["login", "signup"]).default("login"),
		redirect: z.string().default("/").optional(),
	}),
});

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

const signupSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
	confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
	message: "Passwords don't match",
	path: ["confirmPassword"],
})

function RouteComponent() {
	const { m: mode } = Route.useSearch();
	const isSignup = mode === "signup";
	const [error, setError] = useState("");
	const navigate = Route.useNavigate()
	const search = Route.useSearch()

	const signupMutation = useMutation({
		mutationFn: async ({ email, password }: z.infer<typeof signupSchema>) => {
			const alias = email.toLowerCase();
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
						avatar: "",
						phone: "",
						businessId: undefined,
						permissions: {},
					};
					gun.get("user").get(ack.pub).put(userProfile);
					resolve("created");
				});
			});
		},
		onSuccess: () => {
			navigate({ search: (p) => ({ ...p, m: "login" }) })
		},
		onError: (err) => {
			setError(err.message);
		},
	})

	const loginMutation = useMutation({
		mutationFn: async ({ email, password }: z.infer<typeof loginSchema>) => {
			const alias = email.toLowerCase();
			return new Promise((resolve, reject) => {
				gun.user().auth(alias, password, (ack) => {
					if ("err" in ack && ack.err) return reject(new Error(ack.err));
					resolve("loggedin");
				});
			});
		},
		onSuccess: () => {
			navigate({ to: search.redirect })
		},
		onError: (err) => {
			setError(err.message);
		},
	});

	return (
		<section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
			<div className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border px-4 shadow-md dark:[--color-muted:var(--color-zinc-900)]">
				<div className="p-8 pb-6">
					<div>
						<Link to="/" aria-label="go home">
							<Logo />
						</Link>
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
				{
					isSignup ? (
						<AutoForm
							schema={signupSchema}
							onSubmit={v => signupMutation.mutate(v)}
						>
							<SubmitButton className="w-full" loading={signupMutation.isPending}>
								Create Account
							</SubmitButton>
							<p className="text-accent-foreground text-center text-sm pb-2">
								Already have an account?
								<Button asChild variant="link" className="px-2">
									<Link to="/auth" search={(p) => ({ ...p, m: "login" })}>
										Sign in
									</Link>
								</Button>
							</p>
						</AutoForm>
					) : (
						<AutoForm
							schema={loginSchema}
							onSubmit={v => loginMutation.mutate(v)}
						>
							<SubmitButton className="w-full" loading={loginMutation.isPending}>
								Sign In
							</SubmitButton>
							<p className="text-accent-foreground text-center text-sm pb-2">
								Don't have an account yet?
								<Button asChild variant="link" className="px-2">
									<Link to="/auth" search={(p) => ({ ...p, m: "signup" })}>
										Create account
									</Link>
								</Button>
							</p>
						</AutoForm>
					)
				}
			</div>
		</section>
	);
}
