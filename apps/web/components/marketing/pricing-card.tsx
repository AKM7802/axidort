import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PricingCard({
  name,
  price,
  cadence,
  description,
  features,
  highlighted = false,
  ctaLabel = "Get started",
  ctaHref = "/signup",
}: {
  name: string;
  price: string;
  cadence?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel?: string;
  /** Omit for a visually-complete but inert CTA (e.g. "Contact sales" before
   * a real sales channel exists to wire it to). */
  ctaHref?: string | null;
}) {
  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        highlighted && "ring-2 ring-primary shadow-lg shadow-primary/10",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{name}</CardTitle>
          {highlighted && <Badge>Most popular</Badge>}
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-heading text-4xl font-semibold tracking-tight">{price}</span>
          {cadence && <span className="text-sm text-muted-foreground">{cadence}</span>}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="border-t-0 bg-transparent pt-0">
        {ctaHref ? (
          <Button
            className="w-full"
            size="lg"
            variant={highlighted ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={ctaHref} />}
          >
            {ctaLabel}
          </Button>
        ) : (
          <Button type="button" className="w-full" size="lg" variant="outline">
            {ctaLabel}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
