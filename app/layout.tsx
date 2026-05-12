import { SITE_URL } from "@shared/config/site";
import type { Metadata } from "next";
import { Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@core/providers/theme-provider";
import { cn } from "@shared/lib/utils";
import { Toaster } from "@shared/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const fontHeading = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-heading",
});

const TAGLINE = "함께 배우는 사람들의 프로젝트";
const SOCIAL_TITLE = `claude-hunt · ${TAGLINE}`;

// SearchAction omitted — claude-hunt has no on-site search endpoint.
export const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "claude-hunt",
      url: SITE_URL,
      inLanguage: "ko",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "claude-hunt",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
    },
  ],
} as const;

const SITE_JSON_LD_HTML = JSON.stringify(SITE_JSON_LD);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "claude-hunt",
    template: "%s · claude-hunt",
  },
  description: TAGLINE,
  keywords: [
    "Claude Code",
    "Claude Code 클래스",
    "수강생 프로젝트",
    "AI coding",
    "showcase",
  ],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SOCIAL_TITLE,
    description: TAGLINE,
    type: "website",
    siteName: "claude-hunt",
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: TAGLINE,
  },
};

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable,
        fontHeading.variable
      )}
      lang="ko"
      suppressHydrationWarning
    >
      <body>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON.stringify of a static, server-controlled object — required for JSON-LD injection
          dangerouslySetInnerHTML={{ __html: SITE_JSON_LD_HTML }}
          type="application/ld+json"
        />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
