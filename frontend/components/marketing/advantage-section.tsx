import {
  FileSpreadsheetIcon,
  LockIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND_NAME } from "@/lib/brand";

const ADVANTAGES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: ShieldCheckIcon,
    title: "Backed by a real, verified situation",
    description:
      "Every lead reflects something genuinely happening right now — not a purchased list of names. If it's in your digest, it's real, current, and worth the call.",
  },
  {
    icon: SparklesIcon,
    title: "AI does the reading for you",
    description:
      "Our detection engine reads and rewrites every signal in plain English, so you know exactly what's going on — before you ever pick up the phone.",
  },
  {
    icon: TargetIcon,
    title: "Matched to exactly what you sell",
    description:
      "Tell us the service categories you cover and where you work — you only see leads that actually fit your business.",
  },
  {
    icon: LockIcon,
    title: "Full exclusivity on Enterprise",
    description:
      "Enterprise clients get exclusive leads in their market — never sold to a competitor chasing the same job.",
  },
  {
    icon: FileSpreadsheetIcon,
    title: "Ready-to-act delivery, not a data dump",
    description:
      "A clean weekly digest email plus a one-click CSV export — built to drop straight into your calling list or CRM, not a raw spreadsheet to sort through.",
  },
];

export function AdvantageSection() {
  return (
    <section className="border-t border-border/60 bg-muted/30 py-24">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Why {BRAND_NAME} is different
          </h2>
          <p className="mt-4 text-muted-foreground">
            We built the lead source we wished existed: current, specific, and matched to the work you actually
            do.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ADVANTAGES.map((advantage) => (
            <Card key={advantage.title} className="h-full">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <advantage.icon className="size-5" />
                </div>
                <CardTitle className="text-base">{advantage.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{advantage.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
