import type { Metadata } from "next";
import { Geist, Plus_Jakarta_Sans, Syne } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SettingsProvider } from "@/state/settings-context";
import { WorkoutsProvider } from "@/state/workouts-context";
import { PwaRegistration } from "@/components/PwaRegistration";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const syne = Syne({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pomobro",
    template: "%s | Pomobro",
  },
  description:
    "Pomobro is a mobile-first, voice-guided interval timer for workouts and focus sessions, with shareable card-based routines.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Pomobro",
    description:
      "Build and run HIIT, strength, and focus intervals with hands-free voice guidance and shareable workout cards.",
    type: "website",
    siteName: "Pomobro",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pomobro",
    description:
      "Mobile-first interval timer with spoken cues and shareable workouts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('pomobro:theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${plusJakarta.variable} ${syne.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <SettingsProvider>
            <WorkoutsProvider>
              <Analytics />
              <PwaRegistration />
              {children}
            </WorkoutsProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
