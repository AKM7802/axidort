import { SectionIndex } from "@/components/marketing/section-heading";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const ADVANTAGES: { title: string; description: string }[] = [
  {
    title: "Backed by a real, verified situation",
    description:
      "Every lead reflects something genuinely happening right now — not a purchased list of names. If it's in your digest, it's real, current, and worth the call.",
  },
  {
    title: "AI does the reading for you",
    description:
      "Our detection engine reads and rewrites every signal in plain English, so you know exactly what's going on — before you ever pick up the phone.",
  },
  {
    title: "Matched to exactly what you sell",
    description:
      "Tell us the service categories you cover and where you work — you only see leads that actually fit your business.",
  },
  {
    title: "Full exclusivity on Enterprise",
    description:
      "Enterprise clients get exclusive leads in their market — never sold to a competitor chasing the same job.",
  },
  {
    title: "Ready-to-act delivery, not a data dump",
    description:
      "A clean weekly digest email plus a one-click CSV export — built to drop straight into your calling list or CRM, not a raw spreadsheet to sort through.",
  },
];

export function AdvantageSection() {
  return (
    <section className="bg-inverse text-inverse-foreground">
      <div className="mx-auto w-full max-w-7xl px-6 py-24 lg:py-32">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-7">
            <SectionIndex index={2} className="text-inverse-muted" />
            <h2 className="headline mt-5 text-4xl text-balance sm:text-5xl lg:text-6xl">
              Why {BRAND_NAME} is different
            </h2>
          </div>
          <p className="leading-relaxed text-inverse-muted lg:col-span-5">
            We built the lead source we wished existed: current, specific, and matched to the work you actually
            do.
          </p>
        </div>

        <div className="mt-16 grid gap-px border border-inverse-border bg-inverse-border sm:grid-cols-2 lg:grid-cols-3">
          {ADVANTAGES.map((advantage, i) => {
            const lead = i === 0;
            return (
              <div
                key={advantage.title}
                className={cn(
                  "flex flex-col bg-inverse p-7 sm:p-8",
                  lead && "sm:col-span-2 lg:justify-end",
                )}
              >
                <span aria-hidden className="mb-6 block size-2 bg-primary" />
                <h3
                  className={cn(
                    "font-semibold tracking-tight",
                    lead ? "headline text-3xl sm:text-4xl" : "text-lg",
                  )}
                >
                  {advantage.title}
                </h3>
                <p className={cn("mt-3 leading-relaxed text-inverse-muted", lead ? "max-w-xl" : "text-sm")}>
                  {advantage.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
