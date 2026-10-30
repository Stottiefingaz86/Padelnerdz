import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Padel Nerdz",
    template: "%s · Padel Nerdz",
  },
  description:
    "Padel Nerdz — groups, session rooms, and payments for padel communities.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://padelnerdz.com",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} antialiased`}>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
