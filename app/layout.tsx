import type { Metadata } from "next";
import { Geist_Mono, Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@core/providers/theme-provider";
import { cn } from "@shared/lib/utils";
import { Toaster } from "@shared/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

const fontHeading = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.claude-hunt.com"),
  title: {
    default: "claude-hunt",
    template: "%s · claude-hunt",
  },
  description: "Discover what the cohort is building.",
  keywords: ["Claude Code", "cohort projects", "AI coding", "showcase"],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "claude-hunt",
    description: "Discover what the cohort is building.",
    type: "website",
    siteName: "claude-hunt",
  },
  twitter: {
    card: "summary_large_image",
    title: "claude-hunt",
    description: "Discover what the cohort is building.",
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
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
