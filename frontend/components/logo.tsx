import Link from "next/link";

import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** The Axidort mark: an "A" built from a signal-pulse — two converging
 * strokes (the letterform) topped by a ping (the "real-time signal
 * detection" idea from the product copy), rather than plain initials. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]" aria-hidden="true">
        <path
          d="M4.5 18.5 11.3 5.8a.8.8 0 0 1 1.4 0l6.8 12.7"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 13.6h8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="12" cy="3.4" r="1.15" fill="currentColor" />
      </svg>
    </span>
  );
}

const SIZE_STYLES = {
  sm: { link: "text-sm", mark: "size-6 rounded-md" },
  md: { link: "text-base", mark: "size-7 rounded-lg" },
} as const;

export function Logo({
  size = "md",
  className,
  href = "/",
}: {
  size?: keyof typeof SIZE_STYLES;
  className?: string;
  href?: string;
}) {
  const styles = SIZE_STYLES[size];
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 font-heading font-semibold tracking-tight",
        styles.link,
        className,
      )}
    >
      <LogoMark className={styles.mark} />
      {BRAND_NAME}
    </Link>
  );
}
