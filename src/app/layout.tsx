import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavProgress } from "@/components/NavProgress";

export const metadata: Metadata = {
  title: "Deutsch-Heft Team",
  description: "Daily German practice for our study group: missions, reviews, exams and a team leaderboard.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2446a8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Caveat:wght@600;700&family=Hind+Siliguri:wght@400;500;600&display=swap"
        />
      </head>
      <body className="antialiased">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
