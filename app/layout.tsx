import { SITE_URL } from "@shared/config/site";
import type { Metadata } from "next";
import { Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@core/providers/theme-provider";
import { ScrollClampGuard } from "@core/scroll-restoration/scroll-clamp-guard";
import { ScrollDebugProbe } from "@core/scroll-restoration/scroll-debug-probe";
import { cn } from "@shared/lib/utils";
import { Toaster } from "@shared/ui/sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const fontHeading = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-heading",
});

const TAGLINE = "Claude Code 수강생들의 프로젝트";
const META_DESCRIPTION =
  "Claude Code 수강생들이 만든 프로젝트를 둘러보고 응원해 보세요.";
const SOCIAL_TITLE = `클로드 헌트 — ${TAGLINE}`;

// SearchAction omitted — claude-hunt has no on-site search endpoint.
export const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "claude-hunt",
      alternateName: "클로드 헌트",
      url: SITE_URL,
      inLanguage: "ko",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "claude-hunt",
      alternateName: "클로드 헌트",
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
    },
  ],
} as const;

const SITE_JSON_LD_HTML = JSON.stringify(SITE_JSON_LD);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "클로드 헌트",
    template: "%s — 클로드 헌트",
  },
  description: META_DESCRIPTION,
  keywords: [
    "Claude Code",
    "클로드 코드",
    "Claude Code 클래스",
    "클래스 수강생 프로젝트",
    "AI coding",
    "AI 코딩",
    "바이브 코딩",
    "수강생 프로젝트",
    "학습자 프로젝트",
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
    description: META_DESCRIPTION,
    type: "website",
    siteName: "클로드 헌트",
  },
  twitter: {
    card: "summary_large_image",
    title: SOCIAL_TITLE,
    description: META_DESCRIPTION,
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
        <ScrollClampGuard />
        <ScrollDebugProbe />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
