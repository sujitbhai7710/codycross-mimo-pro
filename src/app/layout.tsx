import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CodyCross Daily Answers — Reverse Engineered",
  description:
    "Daily CodyCross crossword puzzle answers, powered by reverse engineering the Android APK. Discover API endpoints, data models, and puzzle structures from com.fanatee.cody v2.8.1.",
  keywords: [
    "CodyCross",
    "daily answers",
    "crossword",
    "reverse engineering",
    "APK decompilation",
    "game API",
    "puzzle solver",
    "Fanatee Games",
  ],
  authors: [{ name: "CodyCross RE Team" }],
  openGraph: {
    title: "CodyCross Daily Answers — Reverse Engineered",
    description:
      "Daily CodyCross answers discovered by decompiling the Android APK. Educational reverse engineering project.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
