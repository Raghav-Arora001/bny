import Header from "@/components/general/header";
import {
  ClerkProvider
} from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSerif = Noto_Serif({subsets:['latin'],variable:'--font-serif'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BNY",
  description: "Build with Next.js and Clerk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <html
        lang="en"
        className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-serif", notoSerif.variable)}
      >
        <body className="min-h-full flex flex-col">
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
