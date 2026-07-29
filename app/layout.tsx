import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: 'swap',
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ULS Transport — CRM",
  description:
    "Outil interne ULS Transport : gestion des clients, des contacts et des expéditions.",
  applicationName: "ULS Transport CRM",
  formatDetection: {
    telephone: false,
  },
  // Internal tool — keep it out of search engines.
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: "/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/pwa-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${outfit.variable} ${inter.variable} antialiased min-h-screen bg-white text-gray-900`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
