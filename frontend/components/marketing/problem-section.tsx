import {
  CircleHelpIcon,
  DatabaseIcon,
  MegaphoneIcon,
  ReceiptTextIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PROBLEMS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: DatabaseIcon,
    title: "Stale lists with zero context",
    description:
      "Purchased or scraped contact lists tell you a business exists — not that it needs you today. By the time you call, the list is months old and the moment has passed.",
  },
  {
    icon: ReceiptTextIcon,
    title: "Expensive, generic data brokers",
    description:
      "You pay per record for the same static company info everyone else already has, with no built-in signal that this is a good time to reach out.",
  },
  {
    icon: SearchIcon,
    title: "Hours of manual research",
    description:
      "Reps burn hours a week digging through directories, news, and social media for scraps of evidence that someone might actually be ready to buy.",
  },
  {
    icon: MegaphoneIcon,
    title: "Spray-and-pray outreach",
    description:
      "Without a real reason to reach out, teams fall back on mass cold email and cold calling — low relevance, low reply rates, and rep burnout.",
  },
  {
    icon: CircleHelpIcon,
    title: "No proof of an actual need",
    description:
      "Nothing in a typical lead list proves the prospect has a current, verifiable problem right now — so every pitch starts from zero.",
  },
];

export function ProblemSection() {
  return (
    <section className="border-t border-border/60 py-24">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            The problem with lead generation today
          </h2>
          <p className="mt-4 text-muted-foreground">
            Most sales teams are stuck choosing between three bad options: stale lists, expensive brokers, or
            hours of manual digging — and still end up guessing at who to call.
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <Card key={problem.title} className="h-full">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <problem.icon className="size-5" />
                </div>
                <CardTitle className="text-base">{problem.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{problem.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
