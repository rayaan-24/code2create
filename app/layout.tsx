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
  title: "NEXORA — Intelligent Community Assistant",
  description:
    "AI-powered spatial and procedural assistant for closed institutional communities. Grounded knowledge, indoor wayfinding, and voice interaction.",
  keywords: [
    "AI assistant",
    "campus assistant",
    "indoor navigation",
    "community directory",
    "institutional knowledge",
    "spatial AI",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FFF8FA] text-[#171717] font-sans selection:bg-[#F4728A]/20 selection:text-[#171717]">
        {children}
      </body>
    </html>
  );
}
