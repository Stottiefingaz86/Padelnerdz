import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Syne } from "next/font/google";

import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Padel Nerdz",
    template: "%s · Padel Nerdz",
  },
  description:
    "Padel Nerdz for club owners and private groups. Mix-ins, Kings & Queens, tickets, check-in, payments, wraps, and progress in one app.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://padelnerdz.com",
  ),
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${syne.variable} antialiased`}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
