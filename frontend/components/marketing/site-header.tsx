import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="eyebrow text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button
          variant="outline"
          className="h-8 border-foreground/80 bg-transparent px-3 hover:bg-foreground hover:text-background"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Log in
        </Button>
      </div>
    </header>
  );
}
