import type { ReactNode } from "react";

import { Logo } from "@/components/logo";

/** Shared frame for the login / password pages: logo bar on top, then a
 * plain left-aligned form on the page itself instead of a floating card. */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center px-6">
          <Logo />
        </div>
      </header>
      <main className="flex flex-1 justify-center px-6 py-16 sm:items-center sm:pb-32">
        <div className="w-full max-w-sm">
          <h1 className="headline text-4xl text-balance">{title}</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">{description}</p>
          <div className="mt-8 border-t border-foreground pt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
