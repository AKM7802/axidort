import Link from "next/link";
import {
  ArrowRightIcon,
  MailCheckIcon,
  MapPinnedIcon,
  RadarIcon,
  SparklesIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdvantageSection } from "@/components/marketing/advantage-section";
import { FeatureCard } from "@/components/marketing/feature-card";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { PricingCard } from "@/components/marketing/pricing-card";
import { ProblemSection } from "@/components/marketing/problem-section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { StepCard } from "@/components/marketing/step-card";
import { TimelyDataSection } from "@/components/marketing/timely-data-section";
import { BRAND_NAME } from "@/lib/brand";

const FEATURES = [
  {
    icon: RadarIcon,
    title: "Real-time signal detection",
    description:
      "We continuously watch for signals that a business needs your exact service — the moment one appears, it's in your queue. No chasing leads that already got fixed months ago.",
    highlighted: true,
    className: "sm:col-span-2",
  },
  {
    icon: SparklesIcon,
    title: "Plain-English, ready to pitch",
    description:
      "Every lead comes with a clear, factual writeup of what's actually going on — so your team knows exactly what to say before they dial.",
  },
  {
    icon: MapPinnedIcon,
    title: "Your territory, your categories",
    description:
      "Target by zip code, borough, or radius, and choose exactly which categories matter to you. Today that's pest, sanitation, equipment, plumbing & temperature.",
  },
  {
    icon: MailCheckIcon,
    title: "Weekly digest + CSV, ready to work",
    description:
      "A clean weekly email of new leads in your territory, plus a one-click CSV export that drops straight into your CRM — no dashboard required.",
    className: "sm:col-span-2",
  },
];

const STEPS = [
  {
    title: "Set your territory & categories",
    description:
      "Sign up, choose the zip codes, boroughs, or radius you sell into, and pick which lead categories you care about.",
  },
  {
    title: "We watch for signals around the clock",
    description:
      "Our detection engine runs continuously, matching every new signal against your criteria the moment it appears.",
  },
  {
    title: "Get leads in your inbox",
    description:
      "Every week, get a digest of new matches with plain-English context and a CSV export — no dashboard required.",
  },
];

const PLANS = [
  {
    name: "Pro",
    price: "$199",
    cadence: "/mo",
    description: "Everything a growing team needs to prospect on autopilot.",
    features: [
      "Up to 3 territories (zip, borough, or radius)",
      "All lead categories",
      "Weekly email digest",
      "CSV export",
      "Standard support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Let's talk",
    description: "For multi-market operators who need a dedicated setup.",
    features: [
      "Unlimited territories",
      "All lead categories",
      "Territory exclusivity included",
      "Custom delivery cadence & integrations",
      "Dedicated account manager",
      "Priority support",
    ],
    ctaLabel: "Contact sales",
    ctaHref: null,
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--color-primary)/18%,transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 -z-10 size-[36rem] -translate-x-[70%] -translate-y-1/3 rounded-full bg-primary/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-1/2 top-0 -z-10 size-[28rem] translate-x-[70%] -translate-y-1/4 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
          />
          <div className="mx-auto grid w-full max-w-6xl gap-16 px-6 py-24 lg:grid-cols-2 lg:items-center lg:py-32">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <Badge variant="secondary" className="mb-6">
                Now live in Chicago — more markets coming
              </Badge>
              <h1 className="text-balance font-heading text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                Reach businesses at the exact moment they need you
              </h1>
              <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
                {BRAND_NAME} continuously detects real, verifiable signals that a business needs your service
                right now — then puts them in your inbox within days, while the window to act is still open.
              </p>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Covering pest, sanitation, equipment, plumbing, and temperature issues in Chicago today — more
                categories and cities on the way.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-11 px-6 text-base" nativeButton={false} render={<Link href="/signup" />}>
                  Get started
                  <ArrowRightIcon />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 px-6 text-base"
                  nativeButton={false}
                  render={<Link href="/login" />}
                >
                  Log in
                </Button>
              </div>
            </div>
            <HeroPreview />
          </div>
        </section>

        {/* Problem */}
        <ProblemSection />

        {/* Why different */}
        <AdvantageSection />

        {/* How it works */}
        <section id="how-it-works" className="border-t border-border/60 py-24">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
              <p className="mt-4 text-muted-foreground">
                Three steps between signing up and your first batch of leads.
              </p>
            </div>
            <div className="relative mt-14 grid gap-6 md:grid-cols-3">
              <div
                aria-hidden
                className="absolute top-8 right-0 left-0 hidden h-px bg-border/60 md:block"
                style={{ marginInline: "16.66%" }}
              />
              {STEPS.map((step, i) => (
                <StepCard key={step.title} step={i + 1} {...step} />
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border/60 bg-muted/30 py-24">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">
                Built for pest, cleaning, repair & other service businesses
              </Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything you need to prospect on autopilot
              </h2>
              <p className="mt-4 text-muted-foreground">
                No more manually digging for scraps of evidence. We do the detection, the writeup, and the
                delivery — you do the selling.
              </p>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Timing / example leads */}
        <TimelyDataSection />

        {/* Pricing */}
        <section id="pricing" className="border-t border-border/60 bg-muted/30 py-24">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                Simple, territory-based pricing
              </h2>
              <p className="mt-4 text-muted-foreground">
                Start self-serve, or talk to us about a custom setup for multiple markets.
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <PricingCard key={plan.name} {...plan} />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/60 py-24">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to stop cold-prospecting blind?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Set your territory and categories in a couple of minutes — your first digest goes out this week.
            </p>
            <Button
              size="lg"
              className="mt-8 h-11 px-6 text-base"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              Get started
              <ArrowRightIcon />
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
