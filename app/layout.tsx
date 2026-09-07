import type { Metadata } from "next";
import "./globals.css";

const title =
  "Michael Joffe — Marketing builder, Product marketing, Applied AI";
const description =
  "I help people adopt breakthrough technology by combining product thinking, behavioral science, and design.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://mwjoffe.github.io"),
  icons: { icon: "/cv/favicon.svg" },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    title,
    description,
    type: "website",
    images: [
      {
        url: "/cv/og.png",
        width: 1200,
        height: 630,
        alt: "Michael Joffe — Marketing builder, Product marketing, Applied AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/cv/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
