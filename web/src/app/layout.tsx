import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
  title: "Torch - 案件管理システム",
  description: "SES案件・人材情報管理システム",
  icons: {
    icon: [
      { url: "/torch-icon.svg", sizes: "32x32", type: "image/svg+xml" },
      { url: "/torch-icon.svg", sizes: "48x48", type: "image/svg+xml" },
      { url: "/torch-icon.svg", sizes: "64x64", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/torch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
