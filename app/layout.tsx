import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";
import { ToasterProvider } from "@/components/toaster-provider";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Analytics } from "@vercel/analytics/next";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProChart RN",
  description:
    "Nursing education EHR simulation — case studies and assessments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        publicSans.variable,
      )}
    >
      <body className="bg-background text-foreground flex h-dvh flex-col overflow-hidden">
        <main className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6">
          {children}
        </main>
        <ToasterProvider />
        <Analytics />
      </body>
    </html>
  );
}
