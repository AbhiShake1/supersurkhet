import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const Features = lazy(() => import("@/components/features-3"));
const FooterSection = lazy(() => import("@/components/footer"));
const HeroSection = lazy(() => import("@/components/hero-section"));
const AboutUs1 = lazy(() => import("@/components/mvpblocks/about-us-1"));
const CongestedPricing = lazy(() => import("@/components/pricing"));
const StatsSection = lazy(() => import("@/components/stats-4"));
const TeamSection = lazy(() => import("@/components/team"));
const WallOfLoveSection = lazy(() => import("@/components/testimonials"));

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
    href: "/auth?m=signup",
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
    href: "/auth?m=signup",
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
