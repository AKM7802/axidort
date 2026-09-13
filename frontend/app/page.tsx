import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  MailCheckIcon,
  MapPinnedIcon,
  RadarIcon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdvantageSection } from "@/components/marketing/advantage-section";
import { ContactDialog } from "@/components/marketing/contact-dialog";
import { FeatureCard } from "@/components/marketing/feature-card";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { PricingCard } from "@/components/marketing/pricing-card";
import { ProblemSection } from "@/components/marketing/problem-section";
import { SectionIndex, SplitHeading } from "@/components/marketing/section-heading";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { StepCard } from "@/components/marketing/step-card";
import { TimelyDataSection } from "@/components/marketing/timely-data-section";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";

const FEATURES = [
  {
    icon: RadarIcon,
    title: "Real-time signal detection",
    description:
      "We continuously watch for signals that a business needs your exact service — the moment one appears, it's in your queue. No chasing leads that already got fixed months ago.",
    highlighted: true,
    className: "lg:col-span-2",
  },
  {
    icon: SparklesIcon,
    title: "Plain-English, ready to pitch",
    description:
      "Every lead comes with a clear, factual writeup of what's actually going on — so your team knows exactly what to say before they dial.",
  },
  {
    icon: MapPinnedIcon,
    title: "Leads matched to your business",
    description:
      "We match every signal against the categories and coverage area you tell us about. Today that's pest, sanitation, equipment, plumbing & temperature.",
  },
  {
    icon: MailCheckIcon,
    title: "Weekly leads + CSV, ready to work",
    description:
      "A clean weekly email of new leads, plus a one-click CSV export that drops straight into your CRM — no dashboard required.",
    className: "lg:col-span-2",
  },
];

const STEPS = [
  {
    title: "Tell us about your business",
    description:
      "Get in touch with your business type — we'll set your account up with the categories and coverage area that fit.",
  },
  {
    title: "We watch for signals around the clock",
    description:
      "Our detection engine runs continuously, matching every new signal against your criteria the moment it appears.",
  },
  {
    title: "Get leads in your inbox every week",
    description:
      "Every week, get new matches with plain-English context and a CSV export — no dashboard required.",
  },
];

const PLANS = [
  {
    name: "Pro",
    price: "$199",
    cadence: "/mo",
    description: "Everything a growing team needs — fresh leads delivered every week.",
    features: [
      "Weekly leads delivered to your inbox",
      "All lead categories",
      "CSV export",
      "Standard support",
    ],
    highlighted: true,
    ctaLabel: "Get in touch",
  },
  {
    name: "Enterprise",
    price: "Let's talk",
    description: "For multi-market operators who need a dedicated, exclusive setup.",
    features: [
      "Weekly leads delivered to your inbox",
      "All lead categories",
      "Full exclusivity — your leads, never shared with a competitor",
      "Custom delivery cadence & integrations",
      "Dedicated account manager",
      "Priority support",
    ],
    ctaLabel: "Contact sales",
  },
];

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description: BRAND_TAGLINE,
};

/** Stagger step for the hero's one-time entrance animation. */
const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

const PRIMARY_CTA = "h-12 rounded-sm px-6 text-base hover:bg-foreground hover:text-background";
const SECONDARY_CTA =
  "h-12 rounded-sm border-foreground/80 bg-transparent px-6 text-base hover:bg-foreground hover:text-background";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-foreground/10">
          <div className="mx-auto grid w-full max-w-7xl gap-16 px-6 pt-14 pb-20 sm:pt-20 lg:grid-cols-12 lg:gap-10 lg:pt-24 lg:pb-28">
            <div className="lg:col-span-7">
              <p className="reveal eyebrow flex items-center gap-2.5 text-foreground" style={stagger(0)}>
                <span aria-hidden className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-70" />
                  <span className="relative size-2 rounded-full bg-primary" />
                </span>
                Now live in Chicago — more markets coming
              </p>
              <h1
                className="reveal headline mt-8 text-5xl text-balance sm:text-6xl lg:text-[5rem] lg:leading-[0.95]"
                style={stagger(1)}
              >
                Reach businesses at the exact moment they need you
              </h1>
              <p className="reveal mt-8 max-w-xl text-lg leading-relaxed text-foreground/80" style={stagger(2)}>
                {BRAND_NAME} continuously detects real, verifiable signals that a business needs your service
                right now — then puts them in your inbox within days, while the window to act is still open.
              </p>
              <p
                className="reveal mt-5 max-w-xl border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground"
                style={stagger(3)}
              >
                Covering pest, sanitation, equipment, plumbing, and temperature issues in Chicago today — more
                categories and cities on the way.
              </p>
              <div className="reveal mt-10 flex flex-col gap-3 sm:flex-row" style={stagger(4)}>
                <Button size="lg" className={PRIMARY_CTA} nativeButton={false} render={<Link href="/login" />}>
                  Log in
                  <ArrowRightIcon />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className={SECONDARY_CTA}
                  nativeButton={false}
                  render={<Link href="#pricing" />}
                >
                  View pricing
                </Button>
              </div>
            </div>
            <div className="reveal lg:col-span-5 lg:pt-12" style={stagger(3)}>
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Problem */}
        <ProblemSection />

        {/* Why different */}
        <AdvantageSection />

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-14 border-b border-foreground/10">
          <div className="mx-auto w-full max-w-7xl px-6 py-24 lg:py-32">
            <SplitHeading index={3} title="How it works">
              <p>Three steps between getting in touch and your first batch of leads.</p>
            </SplitHeading>
            <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-0">
              {STEPS.map((step, i) => (
                <StepCard key={step.title} step={i + 1} {...step} />
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-14 border-b border-foreground/10">
          <div className="mx-auto w-full max-w-7xl px-6 py-24 lg:py-32">
            <SplitHeading index={4} title="Everything you need to prospect on autopilot">
              <p className="eyebrow mb-4 text-foreground">
                Built for pest, cleaning, repair &amp; other service businesses
              </p>
              <p>
                No more manually digging for scraps of evidence. We do the detection, the writeup, and the
                delivery — you do the selling.
              </p>
            </SplitHeading>
            <div className="mt-16 grid gap-px border border-foreground/15 bg-foreground/15 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Timing / example leads */}
        <TimelyDataSection />

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-14 border-b border-foreground/10">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 py-24 lg:grid-cols-12 lg:gap-10 lg:py-32">
            <div className="lg:col-span-4">
              <SectionIndex index={6} />
              <h2 className="headline mt-5 text-4xl text-balance sm:text-5xl">Simple, straightforward pricing</h2>
              <p className="mt-6 max-w-sm leading-relaxed text-muted-foreground">
                Get weekly leads to your inbox, or talk to us about a custom Enterprise setup.
              </p>
            </div>
            <div className="grid divide-y divide-foreground border border-foreground sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:col-span-8">
              {PLANS.map((plan) => (
                <PricingCard key={plan.name} {...plan} />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section>
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-24 lg:grid-cols-12 lg:items-end lg:py-32">
            <h2 className="headline text-5xl text-balance sm:text-6xl lg:col-span-8 lg:text-7xl">
              Ready to stop cold-prospecting blind?
            </h2>
            <div className="lg:col-span-4">
              <p className="leading-relaxed text-muted-foreground">
                Tell us about your business — your first batch of leads can be in your inbox this week.
              </p>
              <ContactDialog
                source="Landing page CTA button"
                trigger={
                  <Button size="lg" className={`mt-6 ${PRIMARY_CTA}`}>
                    Get in touch
                    <ArrowRightIcon />
                  </Button>
                }
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
