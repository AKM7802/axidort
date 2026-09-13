import { SectionIndex } from "@/components/marketing/section-heading";

const PROBLEMS: { title: string; description: string }[] = [
  {
    title: "Stale lists with zero context",
    description:
      "Purchased or scraped contact lists tell you a business exists — not that it needs you today. By the time you call, the list is months old and the moment has passed.",
  },
  {
    title: "Expensive, generic data brokers",
    description:
      "You pay per record for the same static company info everyone else already has, with no built-in signal that this is a good time to reach out.",
  },
  {
    title: "Hours of manual research",
    description:
      "Reps burn hours a week digging through directories, news, and social media for scraps of evidence that someone might actually be ready to buy.",
  },
  {
    title: "Spray-and-pray outreach",
    description:
      "Without a real reason to reach out, teams fall back on mass cold email and cold calling — low relevance, low reply rates, and rep burnout.",
  },
  {
    title: "No proof of an actual need",
    description:
      "Nothing in a typical lead list proves the prospect has a current, verifiable problem right now — so every pitch starts from zero.",
  },
];

export function ProblemSection() {
  return (
    <section className="border-b border-foreground/10">
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 py-24 lg:grid-cols-12 lg:gap-10 lg:py-32">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionIndex index={1} />
            <h2 className="headline mt-5 text-4xl text-balance sm:text-5xl">
              The problem with lead generation today
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
              Most sales teams are stuck choosing between three bad options: stale lists, expensive brokers, or
              hours of manual digging — and still end up guessing at who to call.
            </p>
          </div>
        </div>

        <ol className="border-t border-foreground lg:col-span-7">
          {PROBLEMS.map((problem, i) => (
            <li
              key={problem.title}
              className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-b border-foreground/15 py-7 sm:grid-cols-[4rem_1fr]"
            >
              <span aria-hidden className="eyebrow pt-1.5 text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{problem.title}</h3>
                <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">{problem.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
