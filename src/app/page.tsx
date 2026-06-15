import type { Metadata } from "next";
import Link from "next/link";
import {
  ScanLine,
  Route,
  ShieldCheck,
  Recycle,
  Camera,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Second Life Commerce — Give Every Item a Second Chance",
  description:
    "AI-powered grading and routing for returned and idle items. Resolve the information asymmetry that kills secondary markets.",
};

// ── Pillar definition ─────────────────────────────────────────────────────────
const PILLARS = [
  {
    icon: ScanLine,
    title: "Grade",
    body: "Two photos in, an A–E condition grade out — defects, completeness, and resale value, assessed in seconds.",
  },
  {
    icon: Route,
    title: "Route",
    body: "Resell, refurbish, donate, or recycle. Every item gets the destination that recovers the most value.",
  },
  {
    icon: ShieldCheck,
    title: "Trust",
    body: "A transparent health card travels with each item, so buyers know exactly what they're getting.",
  },
  {
    icon: Recycle,
    title: "Prevent",
    body: "Catch the returns that should never be relisted before they reach a customer a second time.",
  },
] as const;

const STATS = [
  { value: "A–E", label: "condition grades, scored from a single capture" },
  { value: "4", label: "routing outcomes weighed for every item" },
  { value: "< 60s", label: "from photo to a defensible decision" },
] as const;

// ── Pillar card ───────────────────────────────────────────────────────────────
function PillarCard({
  icon: Icon,
  title,
  body,
}: (typeof PILLARS)[number]) {
  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 transition-colors duration-200 hover:border-brand-500/60">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 ring-1 ring-inset ring-brand-500/20 transition-colors group-hover:bg-brand-500/15">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-brand-50">{title}</h3>
      <p className="text-sm leading-relaxed text-brand-300">{body}</p>
    </div>
  );
}

// ── Landing page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-5 pb-24 pt-16 sm:pt-24">
      {/* ── Hero ── */}
      <section
        aria-labelledby="hero-heading"
        className="flex flex-col items-center gap-7 text-center animate-slide-up"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-1.5 text-xs font-medium text-brand-300">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
          Decision intelligence for the circular economy
        </span>

        <h1
          id="hero-heading"
          className="max-w-3xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-brand-50 md:text-6xl lg:text-7xl"
        >
          Give every returned item a{" "}
          <span className="text-brand-500">second life</span>.
        </h1>

        <p className="max-w-xl text-pretty text-lg leading-relaxed text-brand-200">
          Secondary markets fail because no one trusts the condition of a used
          product. We grade it, route it, and vouch for it — so nothing of value
          ends up in landfill by default.
        </p>

        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/grade"
            id="cta-primary"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-semibold text-brand-950 shadow-lg shadow-brand-500/20 transition-all duration-200 hover:bg-brand-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            <Camera className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            Grade an item
          </Link>
          <Link
            href="/dashboard"
            id="cta-secondary"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-7 py-3.5 text-base font-semibold text-brand-200 transition-all duration-200 hover:border-brand-500/60 hover:text-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <LayoutDashboard className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            Seller dashboard
          </Link>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section aria-label="How it works" className="mt-24">
        <div className="mb-6 flex items-center gap-3">
          <span className="rule-accent" aria-hidden="true" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
            The pipeline
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <PillarCard key={p.title} {...p} />
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section
        aria-label="Platform capabilities"
        className="mt-10 grid grid-cols-1 divide-y divide-[var(--card-border)] overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        {STATS.map((s) => (
          <div key={s.value} className="flex flex-col gap-1 px-6 py-7">
            <span className="text-3xl font-bold tabular-nums text-brand-50">
              {s.value}
            </span>
            <span className="text-sm leading-snug text-brand-300">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Closing CTA ── */}
      <section className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-brand-500/20 bg-brand-500/[0.06] px-6 py-10 text-center">
        <h2 className="text-2xl font-semibold text-brand-50">
          See it grade a real item
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-brand-300">
          Point your camera at anything on your desk and watch it get a grade, a
          route, and a value estimate in under a minute.
        </p>
        <Link
          href="/grade"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 transition-colors hover:text-brand-400"
        >
          Start grading
          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="mt-16 text-center text-xs text-brand-300/60">
        Second Life Commerce — built on Next.js, Claude on Amazon Bedrock, and Vercel.
      </footer>
    </main>
  );
}
