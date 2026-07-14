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

export const metadata: Metadata = {
  title: "RefQueue",
  description: "Open-source waitlist with referral — refer friends, move up the line.",
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
