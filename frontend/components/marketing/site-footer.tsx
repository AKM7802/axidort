import Link from "next/link";

import { ContactDialog } from "@/components/marketing/contact-dialog";
import { Logo } from "@/components/logo";
import { BRAND_NAME } from "@/lib/brand";

const PRODUCT_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

const ACCOUNT_LINKS = [{ href: "/login", label: "Log in" }];

const LINK_CLASS = "text-sm text-muted-foreground transition-colors hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="border-t border-foreground">
      <div className="mx-auto w-full max-w-7xl px-6 pt-14 pb-10">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-12">
          <div className="sm:col-span-2 md:col-span-6">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Real-time buying-intent signals, turned into sales-ready leads for service businesses — delivered
              straight to your inbox.
            </p>
          </div>

          <div className="md:col-span-3">
            <p className="eyebrow text-foreground">Product</p>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="eyebrow text-foreground">Account</p>
            <ul className="mt-4 space-y-2.5">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <ContactDialog
                  source="Footer button"
                  trigger={
                    <button type="button" className={LINK_CLASS}>
                      Contact us
                    </button>
                  }
                />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-foreground/15 pt-6">
          <p className="eyebrow text-muted-foreground">
            &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
