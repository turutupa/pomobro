import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SettingsProvider } from "@/state/settings-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pomobro",
    template: "%s | Pomobro",
  },
  description:
    "Pomobro is a mobile-first, voice-guided interval timer for workouts and focus sessions, with shareable card-based routines.",
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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
