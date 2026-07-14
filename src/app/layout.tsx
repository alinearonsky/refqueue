import type { Metadata } from "next";
import { Geist, Geist_Mono, Rye, Oswald, Zilla_Slab } from "next/font/google";
import "./globals.css";

// Geist stays for the maker-internal surface (dashboard, login).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Public surface = a vintage theatre-ticket playbill (see DESIGN.md).
// Rye: the aged letterpress display face (headline + serial numerals).
const rye = Rye({
  variable: "--font-rye",
  subsets: ["latin"],
  weight: ["400"],
});

// Oswald: the condensed grotesque for uppercase utility labels & ticket lettering.
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Zilla Slab: the slab-serif body — reads like printed programme copy.
const zillaSlab = Zilla_Slab({
  variable: "--font-zilla",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const OG_DESCRIPTION =
  "The waitlist that moves — refer friends to skip the line. The free, open-source, self-hosted alternative to GetWaitlist & Viral Loops.";

export const metadata: Metadata = {
  // Absolute-URL base for OG/Twitter image resolution — makers set APP_BASE_URL to their
  // public URL; relative image paths below resolve against it.
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
  title: "RefQueue",
  description: "Open-source waitlist with referral — refer friends, move up the line.",
  openGraph: {
    type: "website",
    title: "RefQueue — the waitlist that moves",
    description: OG_DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "RefQueue — the open-source waitlist that moves, with a vintage Admit One ticket",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RefQueue — the waitlist that moves",
    description: OG_DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${rye.variable} ${oswald.variable} ${zillaSlab.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
