import { HeroHeader } from "@/components/hero5-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BrowseBusiness } from "./browse-business";
import { CreateBusiness } from "./create-business";
import { RainbowButton } from "./magicui/rainbow-button";
import { AnimatedGroup } from "./ui/animated-group";
import Earth from "./ui/globe";
import { Spotlight } from "./ui/spotlight";
import { TextEffect } from "./ui/text-effect";
import { TextReveal } from "./ui/text-reveal";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export default function HeroSection() {
  return (
    <section id="hero">
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
        >
          <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative h-[100vh] flex items-center justify-center">
            <Spotlight
              gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(336, 100%, 50%, 0.08) 0, hsla(341, 100%, 55%, 0.04) 50%, hsla(336, 100%, 45%, 0) 80%)"
              gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(333, 100%, 85%, 0.08) 0, hsla(335, 100%, 55%, 0.04) 80%, transparent 100%)"
              gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(332, 100%, 85%, 0.06) 0, hsla(327, 100%, 85%, 0.06) 80%, transparent 100%)"
            />
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      delayChildren: 1,
                    },
                  },
                },
                item: {
                  hidden: {
                    opacity: 0,
                    y: 20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: "spring",
                      bounce: 0.3,
                      duration: 2,
                    },
                  },
                },
              }}
              className="absolute inset-0 -z-20 pt-[20%]"
            >
              <Earth
                scale={1.2}
                baseColor={[1, 0, 0.3]}
                markerColor={[1, 0, 0.33]}
                glowColor={[1, 0, 0.3]}
              />
            </AnimatedGroup>
            <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"></div>
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0 pb-4">
                <AnimatedGroup variants={transitionVariants}>
                  <BrowseBusiness asChild>
                    <RainbowButton
                      className="rounded-full mb-8"
                      variant="outline"
                    >
                      <span className="text-foreground text-sm">
                        Browse Businesses
                      </span>
                      <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

                      <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                        <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                          <span className="flex size-6">
                            <ArrowRight className="m-auto size-3" />
                          </span>
                          <span className="flex size-6">
                            <ArrowRight className="m-auto size-3" />
                          </span>
                        </div>
                      </div>
                    </RainbowButton>
                  </BrowseBusiness>
                </AnimatedGroup>

                <TextReveal
                  className={cn(
                    `bg-primary from-foreground to-primary via-rose-200 bg-clip-text text-6xl font-bold text-transparent dark:bg-gradient-to-b`,
                  )}
                  from="bottom"
                  split="letter"
                >
                  Surkhet's Digital Hub
                </TextReveal>
                <TextEffect
                  per="line"
                  preset="fade-in-blur"
                  speedSegment={0.3}
                  delay={0.5}
                  as="p"
                  className="mx-auto mt-8 max-w-2xl text-balance text-muted-foreground text-lg"
                >
                  Free enterprise-grade digital solutions with local data
                  sovereignty. Building Nepal's next tech hub, one business at a
                  time.
                </TextEffect>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
                >
                  <div
                    key={1}
                    className="bg-foreground/10 rounded-[calc(var(--radius-xl)+0.125rem)] border p-0.5"
                  >
                    <CreateBusiness asChild>
                      <Button
                        asChild
                        size="lg"
                        className="rounded-xl px-5 text-base"
                      >
                        <span className="text-nowrap">Get Started Free</span>
                      </Button>
                    </CreateBusiness>
                  </div>
                  <Button
                    key={2}
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-10.5 rounded-xl px-5"
                  >
                    <Link to="/">
                      <span className="text-nowrap">Learn More</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>
          </div>
        </section>
      </main>
    </section>
  );
}
