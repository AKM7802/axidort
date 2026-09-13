import { CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ContactDialog } from "@/components/marketing/contact-dialog";
import { cn } from "@/lib/utils";

export function PricingCard({
  name,
  price,
  cadence,
  description,
  features,
  highlighted = false,
  ctaLabel = "Get in touch",
}: {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col p-7 sm:p-9",
        highlighted ? "bg-inverse text-inverse-foreground" : "bg-card",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="eyebrow font-medium">{name}</h3>
        {highlighted && (
          <span className="eyebrow bg-primary px-1.5 py-0.5 font-medium text-primary-foreground">Most popular</span>
        )}
      </div>

      <div className="mt-10 flex items-baseline gap-1.5">
        <span className="headline text-5xl sm:text-6xl">{price}</span>
        {cadence && (
          <span className={cn("font-mono text-sm", highlighted ? "text-inverse-muted" : "text-muted-foreground")}>
            {cadence}
          </span>
        )}
      </div>
      <p className={cn("mt-4 leading-relaxed", highlighted ? "text-inverse-muted" : "text-muted-foreground")}>
        {description}
      </p>

      <ul
        className={cn(
          "mt-8 flex-1 border-t text-sm",
          highlighted ? "border-inverse-border" : "border-foreground/15",
        )}
      >
        {features.map((feature) => (
          <li
            key={feature}
            className={cn(
              "flex items-start gap-3 border-b py-3",
              highlighted ? "border-inverse-border" : "border-foreground/15",
            )}
          >
            <CheckIcon aria-hidden className={cn("mt-0.5 size-4 shrink-0", highlighted ? "text-primary" : "text-signal")} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <ContactDialog
        source={`${name} plan button`}
        trigger={
          <Button
            type="button"
            className={cn(
              "mt-8 h-11 w-full rounded-sm text-base",
              highlighted
                ? "hover:bg-inverse-foreground hover:text-inverse"
                : "border-foreground/80 bg-transparent hover:bg-foreground hover:text-background",
            )}
            variant={highlighted ? "default" : "outline"}
          >
            {ctaLabel}
          </Button>
        }
      />
    </div>
  );
}
