import Features from "@/components/features-3";
import FooterSection from "@/components/footer";
import HeroSection from "@/components/hero-section";
import AboutUs1 from "@/components/mvpblocks/about-us-1";
import Pricing from "@/components/pricing";
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
			<Pricing />
			<TeamSection />
			<FooterSection />
		</>
	);
}
