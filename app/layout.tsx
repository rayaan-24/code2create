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
  title: "NEXORA | Intelligent Closed-Community Platform",
  description:
    "AI-powered intelligent assistant for closed communities such as universities, hospitals, companies, and residential organizations. Natural language procedures, directory, and indoor navigation.",
  keywords: [
    "AI assistant",
    "campus assistant",
    "indoor navigation",
    "community directory",
    "institutional knowledge",
    "glassmorphism",
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased selection:bg-sky-500/30 selection:text-white`}
    >
      <body className="min-h-full flex flex-col bg-[#06080d] text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}
