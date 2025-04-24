export default function StatsSection() {
	return (
		<section className="py-16 md:py-32" id="solution">
			<div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-12">
				<div className="relative z-10 max-w-xl space-y-6">
					<h2 className="text-4xl font-medium lg:text-5xl">
						Building Surkhet's Digital Future Together
					</h2>
					<p>
						SuperSurkhet is empowering local businesses with{" "}
						<span className="font-medium">free digital tools and services</span>{" "}
						to transform Surkhet into Nepal's next tech hub.
					</p>
				</div>
				<div className="grid gap-6 sm:grid-cols-2 md:gap-12 lg:gap-24">
					<div>
						<p>
							We're committed to fostering digital innovation while ensuring
							data sovereignty stays with local businesses and communities.
						</p>
						<div className="mb-12 mt-12 grid grid-cols-2 gap-2 md:mb-0">
							<div className="space-y-4">
								<div className="bg-linear-to-r from-zinc-950 to-zinc-600 bg-clip-text text-5xl font-bold text-transparent dark:from-white dark:to-zinc-800">
									100%
								</div>
								<p>Local Data Ownership</p>
							</div>
							<div className="space-y-4">
								<div className="bg-linear-to-r from-zinc-950 to-zinc-600 bg-clip-text text-5xl font-bold text-transparent dark:from-white dark:to-zinc-800">
									500+
								</div>
								<p>Businesses Empowered</p>
							</div>
						</div>
					</div>
					<div className="relative">
						<blockquote className="border-l-4 pl-4">
							<p>
								SuperSurkhet has transformed how we do business. Their free
								digital tools have helped us reach more customers and grow our
								business in ways we never thought possible.
							</p>

							<div className="mt-6 space-y-3">
								<cite className="block font-medium">
									Ram Kumar Shrestha, Local Business Owner
								</cite>
								<div className="text-sm text-muted-foreground">
									Surkhet Digital Market
								</div>
							</div>
						</blockquote>
					</div>
				</div>
			</div>
		</section>
	);
}
