import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OrientationLock } from '@/components/orientation-lock';

export const metadata: Metadata = {
  title: "GZCLP",
  description: "GZCLP Workout Tracker",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="screen-orientation" content="portrait" />
      </head>
      <body suppressHydrationWarning>
        <OrientationLock />
        {children}
      </body>
    </html>
  );
}
