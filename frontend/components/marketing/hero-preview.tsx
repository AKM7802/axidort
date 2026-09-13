const PREVIEW_LEADS = [
  {
    name: "Example: Riverside Diner",
    category: "Pest",
    snippet: "Active issue found near food prep areas.",
    age: "2d ago",
  },
  {
    name: "Example: Golden Wok Express",
    category: "Temperature",
    snippet: "Equipment holding outside safe range.",
    age: "3d ago",
  },
  {
    name: "Example: Sunrise Bakery",
    category: "Plumbing",
    snippet: "Fixture flagged as non-functional.",
    age: "1d ago",
  },
];

/** A stylized preview of what a client's inbox looks like — deliberately
 * illustrative (no real data), used purely so the hero shows the product's
 * output instead of describing it in the abstract. Styled as a printed
 * digest sheet rather than a fake app window. */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Offset sheet behind, like a stack of printed reports */}
      <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 border border-foreground/15 bg-muted" />
      <div className="relative border border-foreground/80 bg-card">
        <div className="flex items-center justify-between border-b border-foreground/80 px-5 py-3">
          <span className="eyebrow font-medium text-foreground">3 new leads this week</span>
          <span aria-hidden className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="size-1.5 rounded-full bg-foreground/20" />
            <span className="size-1.5 rounded-full bg-foreground/20" />
          </span>
        </div>
        <ol className="divide-y divide-dashed divide-foreground/20">
          {PREVIEW_LEADS.map((lead, i) => (
            <li key={lead.name} className="grid grid-cols-[auto_1fr_auto] gap-x-4 px-5 py-4">
              <span className="eyebrow pt-0.5 text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <p className="truncate font-medium">{lead.name}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{lead.snippet}</p>
                <span className="eyebrow mt-2.5 inline-block border border-foreground/25 px-1.5 py-0.5 text-foreground/80">
                  {lead.category}
                </span>
              </div>
              <span className="eyebrow pt-0.5 font-medium text-signal">{lead.age}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
