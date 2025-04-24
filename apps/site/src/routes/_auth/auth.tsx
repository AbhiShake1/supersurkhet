import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_auth/auth")({
	component: RouteComponent,
	validateSearch: z.object({
		m: z.enum(["login", "signup"]).default("login"),
	}),
});

function RouteComponent() {
	const { m: mode } = Route.useSearch();
	const isSignup = mode === "signup";

	return (
		<section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
			<form
				action=""
				className="bg-card m-auto h-fit w-full max-w-sm rounded-[calc(var(--radius)+.125rem)] border p-0.5 shadow-md dark:[--color-muted:var(--color-zinc-900)]"
			>
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

					<div className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="email" className="block text-sm">
								Email
							</Label>
							<Input type="email" required name="email" id="email" />
						</div>
						<div
							className={`grid ${isSignup ? "grid-cols-2 gap-4" : "grid-cols-1"}`}
						>
							<PasswordInput
								label="Password"
								required
								name="pwd"
								id="pwd"
								containerClassName="space-y-0.5"
							/>
							{isSignup && (
								<PasswordInput
									label="Confirm Password"
									required
									name="pwd_confirm"
									id="pwd_confirm"
									containerClassName="space-y-0.5"
								/>
							)}
						</div>
						<Button className="w-full">
							{isSignup ? "Create Account" : "Sign In"}
						</Button>
					</div>
				</div>

				<div className="bg-muted rounded-(--radius) border p-3">
					<p className="text-accent-foreground text-center text-sm">
						{isSignup ? "Already have an account?" : "Don't have an account ?"}
						<Button asChild variant="link" className="px-2">
							<Link to="/auth" search={{ m: isSignup ? "login" : "signup" }}>
								{isSignup ? "Sign in" : "Create account"}
							</Link>
						</Button>
					</p>
				</div>
			</form>
		</section>
	);
}
