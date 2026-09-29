import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Coach",
  description: "Practice spoken English with constructive feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <a href="#main-content" className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-lg focus:bg-sky-900 focus:px-4 focus:py-2 focus:text-white">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
