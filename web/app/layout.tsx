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
        {children}
      </body>
    </html>
  );
}
