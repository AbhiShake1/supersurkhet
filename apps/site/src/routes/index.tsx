import Features from "@/components/features-3";
import FooterSection from "@/components/footer";
import HeroSection from "@/components/hero-section";
import AboutUs1 from "@/components/mvpblocks/about-us-1";
import { CongestedPricing } from "@/components/pricing";
import StatsSection from "@/components/stats-4";
import TeamSection from "@/components/team";
import WallOfLoveSection from "@/components/testimonials";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<>
			<HeroSection />
			<StatsSection />
			<Features />
			<WallOfLoveSection />
			<AboutUs1 />
			<CongestedPricing
				plans={plans}
				description="Empowering Surkhet's businesses with accessible technology. Our pricing reflects our commitment to making digital transformation possible for everyone in our community."
				title="Community-First Pricing"
			/>
			<TeamSection />
			<FooterSection />
		</>
	);
}

const plans = [
	{
		name: "FREE",
		price: "0",
		yearlyPrice: "0",
		period: "per month",
		features: [
			"Full Business Profile",
			"Local Data Storage",
			"Digital Storefront",
			"Basic Analytics",
			"Community Support",
			"Zero Commission",
		],
		description: "Perfect for individuals and small projects",
		buttonText: "Start Free Trial",
		href: "/sign-up",
		isPopular: false,
	},
	{
		name: "GROWTH",
		price: "599",
		yearlyPrice: "479",
		period: "per month",
		features: [
			"All Community Features",
			"Advanced Analytics",
			"Priority Support",
			"Custom Domain",
			"Multiple User Access",
			"Inventory Management",
			"Payment Integration",
			"Marketing Tools",
		],
		description: "Ideal for growing teams and businesses",
		buttonText: "Get Started",
		href: "/sign-up",
		isPopular: true,
	},
	{
		name: "ENTERPRISE",
		price: "1999",
		yearlyPrice: "1599",
		period: "per month",
		features: [
			"All Growth Features",
			"Unlimited Storage",
			"Dedicated Support",
			"Custom Integration",
			"Advanced Security",
			"SLA Guarantee",
			"Training & Onboarding",
		],
		description: "For large organizations with specific needs",
		buttonText: "Contact Sales",
		href: "/contact",
		isPopular: false,
	},
];
