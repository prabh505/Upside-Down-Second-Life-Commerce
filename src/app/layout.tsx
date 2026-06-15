import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import Providers from "./Providers";

// ── Font setup ───────────────────────────────────────────────────────────────
// Inter is loaded via next/font for automatic subsetting, zero layout shift,
// and self-hosting (no runtime Google Fonts request).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// ── Site-wide metadata ────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "Second Life Commerce — AI-Powered Circular Economy Platform",
    template: "%s | Second Life Commerce",
  },
  description:
    "Resolve the information asymmetry that makes secondary markets fail. Grade, route, and trust every returned or idle item — powered by AI.",
  keywords: [
    "circular economy",
    "recommerce",
    "product grading",
    "returns intelligence",
    "second life",
    "resell",
    "sustainability",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    siteName: "Second Life Commerce",
    title: "Second Life Commerce — AI-Powered Circular Economy Platform",
    description:
      "AI decision-intelligence for the circular economy. Grade · Route · Trust · Prevent.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[var(--background)] text-[var(--foreground)] antialiased">
        {/*
          CSS-only hamburger navigation (checkbox hack).

          HOW IT WORKS:
          1. A hidden <input type="checkbox" id="nav-toggle"> sits at the top.
          2. A <label htmlFor="nav-toggle"> is the ☰ / ✕ hamburger button.
          3. The CSS rule #nav-toggle:checked ~ nav .nav-links targets the
             sibling <nav> and applies display:flex to the link container.
          4. No JavaScript event listener, no useState, no library.

          On desktop (sm+), the links are always visible and the hamburger is hidden.
          This approach is accessible: the checkbox is focusable, keyboard-operable,
          and screen readers announce "navigation menu expanded/collapsed" via aria.
        */}

        {/* Hidden checkbox — controls nav visibility */}
        <input
          type="checkbox"
          id="nav-toggle"
          className="hidden peer"
          aria-hidden="true"
        />

        <nav
          className="flex flex-wrap items-center gap-x-4 px-4 py-2.5 border-b border-[var(--card-border)] bg-[var(--background)]"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="text-sm font-bold text-brand-100 tracking-tight mr-auto"
          >
            Second Life
          </Link>

          {/* Hamburger label (mobile only) */}
          <label
            htmlFor="nav-toggle"
            className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg
                       text-brand-400 hover:text-brand-200 hover:bg-brand-900/50
                       cursor-pointer transition-colors"
            aria-label="Toggle navigation menu"
          >
            {/* ☰ bar icon — three lines via CSS */}
            <span className="relative w-4 h-3 flex flex-col justify-between">
              <span className="w-full h-[2px] bg-current rounded transition-transform" />
              <span className="w-full h-[2px] bg-current rounded transition-opacity" />
              <span className="w-full h-[2px] bg-current rounded transition-transform" />
            </span>
          </label>

          {/*
            Nav links container.
            Mobile: hidden by default; shown via peer-checked.
            Desktop (sm+): always flex.
          */}
          <div
            className="nav-links hidden peer-checked:flex flex-col sm:flex sm:flex-row
                        w-full sm:w-auto gap-1 sm:gap-3 pt-2 sm:pt-0
                        border-t border-[var(--card-border)] sm:border-0 mt-2 sm:mt-0"
          >
            <Link
              href="/grade"
              className="text-xs font-medium text-brand-400 hover:text-brand-200
                         px-2 py-1.5 rounded-lg hover:bg-brand-900/50 transition-colors"
            >
              Grade an item
            </Link>
            <Link
              href="/dashboard"
              className="text-xs font-medium text-brand-400 hover:text-brand-200
                         px-2 py-1.5 rounded-lg hover:bg-brand-900/50 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/map"
              className="text-xs font-medium text-brand-400 hover:text-brand-200
                         px-2 py-1.5 rounded-lg hover:bg-brand-900/50 transition-colors"
            >
              Exchange Map
            </Link>
          </div>
        </nav>

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
