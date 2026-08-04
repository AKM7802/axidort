import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { ClientAuthProvider } from "@/lib/client-auth";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION = `${BRAND_NAME} turns real-time public data signals into qualified sales leads, delivered to your inbox.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s — ${BRAND_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    "lead generation",
    "sales leads",
    "pest control leads",
    "cleaning company leads",
    "service business leads",
    "B2B leads",
  ],
  authors: [{ name: BRAND_NAME }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: BRAND_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClientAuthProvider>
          {children}
          <Toaster />
        </ClientAuthProvider>
      </body>
    </html>
  );
}
