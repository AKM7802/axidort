import { Badge } from "@/components/ui/badge";
import { BRAND_NAME } from "@/lib/brand";
import { ExampleLeadCard } from "@/components/marketing/example-lead-card";

const EXAMPLE_LEADS = [
  {
    businessName: "Example: Riverside Diner",
    categories: ["Pest", "Sanitation"],
    issue:
      "Live rodent activity found near food prep areas, plus an unsealed gap that could let pests back in.",
    flaggedDate: "July 28, 2026",
    daysToDeliver: 2,
  },
  {
    businessName: "Example: Golden Wok Express",
    categories: ["Equipment", "Temperature"],
    issue:
      "Walk-in cooler holding above safe temperature, risking spoiled inventory if it isn't repaired soon.",
    flaggedDate: "July 29, 2026",
    daysToDeliver: 3,
  },
  {
    businessName: "Example: Sunrise Bakery & Cafe",
    categories: ["Plumbing", "Sanitation"],
    issue:
      "Hand-washing sink not functioning in the prep area, plus a slow floor drain flagged as a risk.",
    flaggedDate: "July 30, 2026",
    daysToDeliver: 2,
  },
];

export function TimelyDataSection() {
  return (
    <section className="border-t border-border/60 py-24">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Why timing matters
          </h2>
          <p className="mt-4 text-muted-foreground">
            An issue from six months ago is old news to everyone, including your prospect. An issue from a few
            days ago is still the first thing on their mind — and exactly when outreach converts best. That&apos;s
            the gap {BRAND_NAME} is built to close.
          </p>
          <Badge variant="outline" className="mt-4 text-muted-foreground">
            Illustrative examples — not live data
          </Badge>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLE_LEADS.map((lead) => (
            <ExampleLeadCard key={lead.businessName} {...lead} />
          ))}
        </div>
      </div>
    </section>
  );
}
