import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@core/providers/theme-provider.tsx";
import { cn } from "@shared/lib/utils.ts";
import { Toaster } from "@shared/ui/sonner.tsx";

export const metadata: Metadata = {
  title: {
    default: "claude-hunt",
    template: "%s · claude-hunt",
  },
  description: "Discover what the cohort is building.",
};

const notoSans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans" });

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
        notoSans.variable
      )}
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
