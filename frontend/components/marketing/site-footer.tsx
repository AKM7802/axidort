import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { ContactDialog } from "@/components/marketing/contact-dialog";
import { Logo } from "@/components/logo";
import { BRAND_NAME } from "@/lib/brand";

const PRODUCT_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

const ACCOUNT_LINKS = [{ href: "/login", label: "Log in" }];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto w-full max-w-7xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Real-time buying-intent signals, turned into sales-ready leads for service businesses — delivered
              straight to your inbox.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium">Product</p>
            <ul className="mt-3 space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium">Account</p>
            <ul className="mt-3 space-y-2">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <ContactDialog
                  source="Footer button"
                  trigger={
                    <button type="button" className="text-sm text-muted-foreground hover:text-foreground">
                      Contact us
                    </button>
                  }
                />
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
