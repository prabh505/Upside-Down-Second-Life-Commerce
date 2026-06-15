<div align="center">

# ♻️ Second Life Commerce

**AI-Powered Circular Economy Platform**

*Resolve the information asymmetry that makes secondary markets fail.*
*Grade · Route · Trust · Prevent*

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Claude](https://img.shields.io/badge/Claude_Sonnet-Bedrock-cc785c?logo=anthropic)](https://aws.amazon.com/bedrock/)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/Upside-Down-Second-Life-Commerce)

</div>

---

## 🧠 The Problem

> Every year, **billions of dollars** worth of returned and idle products end up in landfills — not because they're broken, but because **no one knows what they're worth**.

This is Akerlof's "market for lemons" at scale. Without trustworthy condition data, secondary markets collapse. Sellers can't prove quality, buyers can't trust listings, and platforms can't route inventory efficiently.

**Second Life Commerce** is a **trust layer** that makes secondary markets possible. It uses AI vision to grade items, determine eligibility, route them to the best next life, and provide a trust artifact (the Product Health Card) that anyone can verify.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📸 **Two-Photo AI Grading** | Capture front + expiry label → Claude Sonnet 4 on Bedrock grades condition (A–E), extracts dates, detects defects |
| 🏷️ **Product Health Card** | Physical-tag aesthetic with CSS perforations, grade band, expiry status, routing decision, and chat affordance |
| 🔄 **Intelligent Routing** | Rule-based engine: Resell → Refurbish → Donate → Exchange → Recycle, based on condition, demand, and distance |
| 🛡️ **Eligibility Gate** | Safety-critical + expired = **always blocked**. Perishable + expired = **recycle only**. No exceptions. |
| 📊 **Routing Simulator** | Interactive sliders (distance / demand / condition) with instant client-side routing recalculation |
| 📈 **Seller Dashboard** | Weekly digest, routing lanes, ineligible panel, demand sparkline — all zero-library SVG |
| 🌍 **Community Exchange Map** | Leaflet + OpenStreetMap with 5 exchange points, category filters, distance sorting |
| 🏆 **Second Life Score** | Composite 0–100 score (40% condition + 30% demand + 20% depreciation + 10% shelf life) |
| 💚 **Green Credits Wallet** | CO₂ impact estimation, e-waste diversion tracking, clipboard share |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Edge + Serverless)            │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │    /     │  │  /grade  │  │/dashboard│  │  /map  │  │
│  │ Landing  │  │ Capture  │  │  Seller  │  │Exchange│  │
│  │  Page    │  │  Flow    │  │ Co-pilot │  │  Map   │  │
│  └──────────┘  └────┬─────┘  └──────────┘  └────────┘  │
│                     │                                    │
│               ┌─────▼─────┐                              │
│               │/api/assess│  ← Serverless function       │
│               │  (60s max)│    (server-side only)        │
│               └─────┬─────┘                              │
└─────────────────────┼───────────────────────────────────┘
                      │
                ┌─────▼─────┐
                │  Amazon   │
                │  Bedrock  │
                │ Claude 4  │
                └───────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.17+
- **npm** 9+
- **Amazon Bedrock** access with Claude Sonnet enabled

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/Upside-Down-Second-Life-Commerce.git
cd Upside-Down-Second-Life-Commerce
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
AWS_BEARER_TOKEN_BEDROCK=your_bearer_token_here
BEDROCK_REGION=ap-south-1
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20251101-v1:0
```

> ⚠️ **These are server-side only variables.** They are NEVER exposed to the browser. Do not prefix with `NEXT_PUBLIC_`.

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Type check & build

```bash
npm run type-check   # TypeScript strict mode — zero errors
npm run build        # Production build — 9 routes
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout — nav bar, Providers
│   ├── page.tsx                # Landing page
│   ├── Providers.tsx           # Client wrapper (GradingContext)
│   ├── globals.css             # Design system
│   ├── grade/
│   │   └── page.tsx            # Two-photo capture state machine
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout
│   │   └── page.tsx            # Seller co-pilot dashboard
│   ├── map/
│   │   └── page.tsx            # Community exchange map
│   ├── simulator/
│   │   └── page.tsx            # Standalone routing simulator
│   └── api/
│       └── assess/
│           └── route.ts        # POST /api/assess — AI grading endpoint
├── components/
│   ├── ErrorBoundary.tsx       # React class error boundary (3 fallbacks)
│   ├── capture/
│   │   ├── CameraView.tsx      # getUserMedia camera + desktop fallback
│   │   ├── PhotoPreview.tsx    # Photo review with retake
│   │   └── StepIndicator.tsx   # Progress dots
│   ├── health-card/
│   │   ├── HealthCard.tsx      # Product Health Card (container)
│   │   ├── GradeBand.tsx       # Grade color band + badge
│   │   ├── ExpiryRow.tsx       # Expiry status (red for expired)
│   │   ├── RoutingDecision.tsx # Collapsible routing explanation
│   │   ├── ResaleBar.tsx       # Animated value bar
│   │   └── ChatAffordance.tsx  # MVP chat stub
│   ├── simulator/
│   │   └── RoutingSimulator.tsx # Interactive routing simulator
│   ├── dashboard/
│   │   ├── WeeklyDigest.tsx    # Metric gauges
│   │   ├── RoutingLanes.tsx    # Horizontal stacked bar
│   │   ├── IneligiblePanel.tsx # Blocked items list
│   │   ├── DemandSparkline.tsx # SVG sparkline
│   │   └── InsightCallout.tsx  # AI co-pilot callout
│   ├── score/
│   │   └── SecondLifeScore.tsx # SVG arc gauge (0–100)
│   ├── wallet/
│   │   └── GreenCreditsWallet.tsx # CO₂ impact + share
│   ├── map/
│   │   ├── ExchangeMap.tsx     # SSR-safe wrapper + filters
│   │   ├── MapInner.tsx        # Leaflet map + DivIcons
│   │   └── ExchangePoint.tsx   # Sorted list fallback
│   └── ui/
│       └── Spinner.tsx         # Pure CSS spinner
├── context/
│   └── GradingContext.tsx      # React Context for grading result
└── lib/
    ├── types.ts                # All TypeScript types
    └── constants.ts            # Grade colors, categories, thresholds
```

---

## 🔐 Security

| Principle | Implementation |
|-----------|---------------|
| **Server-only secrets** | `AWS_BEARER_TOKEN_BEDROCK` is accessed only inside `src/app/api/assess/route.ts` via `process.env`. Never imported by any component. |
| **No client exposure** | Zero `NEXT_PUBLIC_` prefixed secrets. `grep` against build output confirms no leakage. |
| **In-app camera only** | No gallery upload — ensures photo recency and prevents stock photo fraud. |
| **Eligibility blocking** | Safety-critical + expired items are **always** routed to Recycle. No override possible. |

---

## 🌐 Deploy to Vercel

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/Upside-Down-Second-Life-Commerce)

### Manual deploy

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the `Upside-Down-Second-Life-Commerce` repository
4. Add environment variables in project settings:
   - `AWS_BEARER_TOKEN_BEDROCK` — your Bedrock bearer token
   - `BEDROCK_REGION` — e.g. `ap-south-1`
   - `BEDROCK_MODEL_ID` — e.g. `anthropic.claude-sonnet-4-5-20251101-v1:0`
5. Deploy — Vercel auto-detects Next.js and configures everything

### vercel.json

The included `vercel.json` sets `maxDuration: 60` for API routes (Bedrock vision calls can take 15–40s).

---

## 🧪 Test Matrix

| # | Test | Expected |
|---|------|----------|
| T1 | Grade a phone (category=none) | HealthCard with grade + routing, all 4 result components |
| T2 | Grade expired sunscreen (perishable) | Red ExpiryRow, routing="Recycle", gray wallet |
| T3 | Grade car seat with blurry label | rePrompt state, front photo preserved |
| T4 | Retake label after rePrompt | If still unreadable → Recycle + PROVISIONAL badge |
| T5 | Routing Simulator: grade=E | "Recycle". demand=0 → "Exchange" |
| T6 | Dashboard | 4 ineligible items, correct lane widths |
| T7 | Green Credits share | Clipboard copy, "Copied! ✓" for 2s |
| T8 | Exchange Map: filter "NGO" | Only 2 markers visible |
| T9 | CameraView error boundary | "Camera unavailable" + Refresh button |
| T10 | Mobile capture (Android) | Full flow in <30s |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS |
| **AI Model** | Claude Sonnet 4 on Amazon Bedrock (Converse API) |
| **Maps** | Leaflet + react-leaflet + OpenStreetMap |
| **Deployment** | Vercel (serverless + edge) |
| **Auth** | Bearer token (server-side only) |
| **Database** | None (MVP — stateless per-session) |

---

## 📋 Domain Rules

> These are safety-critical and ethically non-negotiable.

```
safety_critical + (expired OR no_readable_date) → Recycle ONLY
perishable + expired → Recycle or Dispose
perishable + near_expiry → Local time-boxed discount resell or Donate
non_resalable → Donate or Dispose (never resell)
```

---

## 🔮 Roadmap (Post-MVP)

- [ ] Postgres + pgvector for persistent storage
- [ ] Real marketplace demand feed
- [ ] ML-based routing (XGBoost) trained on MVP data
- [ ] User authentication & multi-tenant
- [ ] QR code generation for Health Cards
- [ ] LLM-powered chat on Health Card
- [ ] Multi-language support (i18n)
- [ ] Playwright e2e test suite
- [ ] Geolocation-based exchange map centering

---

## 👥 Team

Built for **HackOn** hackathon.

---

<div align="center">

**♻️ Every product deserves a second life.**

</div>
