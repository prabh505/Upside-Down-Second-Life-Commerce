import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Second Life Commerce — Give Every Item a Second Chance",
  description:
    "AI-powered grading and routing for returned and idle items. Resolve the information asymmetry that kills secondary markets.",
};

// ── Stat card sub-component ───────────────────────────────────────────────────
function StatCard({
  value,
  label,
  suffix,
}: {
  value: string;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-8 py-6 animate-fade-in">
      <span className="text-4xl font-bold text-brand-400 tabular-nums">
        {value}
        {suffix && (
          <span className="text-2xl text-brand-600 ml-1">{suffix}</span>
        )}
      </span>
      <span className="text-sm text-brand-300 text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// ── Pillar badge sub-component ────────────────────────────────────────────────
function PillarBadge({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm text-brand-200 font-medium">
      <span aria-hidden="true">{icon}</span>
      {label}
    </div>
  );
}

// ── CTA button sub-component ──────────────────────────────────────────────────
function CTAButton({
  href,
  primary,
  children,
}: {
  href: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";
  const variants = primary
    ? "bg-brand-500 text-brand-950 hover:bg-brand-400 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-500/20"
    : "border border-[var(--card-border)] bg-[var(--card)] text-brand-200 hover:border-brand-500 hover:text-brand-100 hover:bg-[var(--muted)]";

  return (
    <Link href={href} id={primary ? "cta-primary" : "cta-secondary"} className={`${base} ${variants}`}>
      {children}
    </Link>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      {/* ── Hero section ── */}
      <section
        aria-labelledby="hero-heading"
        className="flex max-w-3xl flex-col items-center gap-6 text-center animate-slide-up"
      >
        {/* Eyebrow */}
        <div className="flex items-center gap-2 rounded-full border border-brand-700 bg-brand-950 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
          AI Decision Intelligence · Circular Economy
        </div>

        {/* Headline */}
        <h1
          id="hero-heading"
          className="text-5xl font-extrabold leading-[1.1] tracking-tight text-brand-50 md:text-6xl lg:text-7xl"
        >
          Every item deserves a{" "}
          <span className="text-brand-400">second life</span>
        </h1>

        {/* Sub-headline */}
        <p className="max-w-xl text-lg text-brand-200 leading-relaxed">
          Second Life Commerce resolves the information asymmetry that kills
          secondary markets. Grade, route, and trust every returned or idle item
          — powered by AI.
        </p>

        {/* Four pillars */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          <PillarBadge icon="🔬" label="Grading" />
          <PillarBadge icon="🗺️" label="Routing" />
          <PillarBadge icon="🤝" label="Trust" />
          <PillarBadge icon="🛡️" label="Prevention" />
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
          <CTAButton href="/grade" primary>
            <span aria-hidden="true">📸</span>
            Grade an Item
          </CTAButton>
          <CTAButton href="/dashboard">
            <span aria-hidden="true">📊</span>
            Seller Dashboard
          </CTAButton>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section
        aria-label="Platform impact metrics"
        className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl"
      >
        <StatCard value="₹ recovered" label="per item kept out of landfill" />
        <StatCard value="5-tier" label="AI condition grading" suffix="" />
        <StatCard value="< 60s" label="end-to-end assessment time" />
      </section>

      {/* ── Footer note ── */}
      <footer className="mt-16 text-xs text-brand-700 text-center">
        Built on Next.js · Claude Sonnet on Amazon Bedrock · Deployed on Vercel
      </footer>
    </main>
  );
}
