// Canonical site URL — used to build absolute URLs for metadata (Open
// Graph, canonical links, sitemap, robots.txt). Falls back to localhost so
// `next build` never fails in dev/CI just because this isn't set yet.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
