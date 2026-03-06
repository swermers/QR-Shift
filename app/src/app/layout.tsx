import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Shift — Dynamic QR Code Platform",
  description:
    "Print once, update anytime. Dynamic QR codes with context-aware routing, automation, and an API for AI agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Fraunces:wght@400;700&display=swap"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
