import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Logo } from "./logo";
import { useProfile } from "@/hooks/use-profile";

const menuItems = [
	{ name: "Features", href: "#features" },
	{ name: "Solution", href: "#solution" },
	{ name: "Pricing", href: "#pricing" },
	{ name: "About", href: "#about" },
];

export const Header = ({ children }: React.PropsWithChildren) => {
	const [menuState, setMenuState] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 50);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);
	const { auth } = useRouteContext({ from: "__root__" });
	const user = useProfile()
	return (
		<header>
			<nav
				data-state={menuState && "active"}
				className="fixed z-20 w-full px-2"
			>
				<div
					className={cn(
						"mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12",
						isScrolled &&
						"bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5",
					)}
				>
					<div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
						<div className="flex w-full justify-between lg:w-auto">
							<Link
								to="/"
								aria-label="home"
								className="flex items-center space-x-2"
							>
								<Logo />
							</Link>

							<button
								onClick={() => setMenuState(!menuState)}
								aria-label={menuState == true ? "Close Menu" : "Open Menu"}
								className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
							>
								<Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
								<X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
							</button>
						</div>

						{children}

						<div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
							<div className="lg:hidden">
								<ul className="space-y-6 text-base">
									{menuItems.map((item, index) => (
										<li key={index}>
											<Link
												to={item.href}
												className="text-muted-foreground hover:text-accent-foreground block duration-150"
											>
												<span>{item.name}</span>
											</Link>
										</li>
									))}
								</ul>
							</div>
							<div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
								{user ? (
									<Popover>
										<PopoverTrigger asChild>
											<button className="flex items-center gap-2 rounded-full border px-2 py-1 hover:bg-muted/50 transition justify-center">
												<Avatar>
													<AvatarImage src={user?.avatar} alt={user.email} />
													<AvatarFallback className="capitalize">{user.email?.[0]}</AvatarFallback>
												</Avatar>
											</button>
										</PopoverTrigger>
										<PopoverContent align="end" className="w-56 p-0 overflow-hidden">
											<div className="flex flex-col items-center gap-2 p-4 border-b">
												<Avatar>
													<AvatarImage src={user?.avatar} alt={user.email} />
													<AvatarFallback className="capitalize">{user.email?.[0]}</AvatarFallback>
												</Avatar>
												<div className="text-base font-semibold">{user.email || user.email || "User"}</div>
											</div>
											<div className="flex flex-col">
												<Link to="/settings" className="px-4 py-2 hover:bg-muted text-left text-sm">Settings</Link>
												<button
													className="px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
													onClick={() => auth.logout?.()}
												>
													Log out
												</button>
											</div>
										</PopoverContent>
									</Popover>
								) : (
									<>
										<Button asChild variant="outline" size="sm" className={cn(isScrolled && "lg:hidden")}>
											<Link to="/auth" search={{ m: "login" }}>
												<span>Login</span>
											</Link>
										</Button>
										<Button asChild size="sm" className={cn(isScrolled && "lg:hidden")}>
											<Link to="/auth" search={{ m: "signup" }}>
												<span>Sign Up</span>
											</Link>
										</Button>
									</>
								)}
							</div>
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
}

export const HeroHeader = () => {
	return <Header>
		<div className="absolute inset-0 m-auto hidden size-fit lg:block">
			<ul className="flex gap-8 text-sm">
				{menuItems.map((item, index) => (
					<li key={index}>
						<Link
							to={item.href}
							className="text-muted-foreground hover:text-accent-foreground block duration-150"
						>
							<span>{item.name}</span>
						</Link>
					</li>
				))}
			</ul>
		</div>
	</Header>
};
