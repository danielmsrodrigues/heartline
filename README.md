<p align="center"><img src="assets/images/logo.png" alt="Heartline" width="110"></p>

<h1 align="center">Heartline</h1>

<p align="center">A native iOS app that helps anyone understand their clinical exams —<br>integrated, longitudinal, and personalized.</p>

## What it does

Heartline crosses all your exam data over time — with family history and
lifestyle — and explains what the **combination** of your data suggests, in
clear language with concrete actions.

- **Photograph or import** clinical exams (camera, gallery, or PDF)
- **AI extraction** of biomarker values, units, and the lab's own reference
  ranges — with per-value confidence and a mandatory confirmation step where
  the user reviews and can edit everything before anything is saved
- **Deterministic scoring** — 4 attention levels computed by pure functions
  from ranges, trends, and family history; never by the AI
- **Personalized narrative** — AI-generated insights that connect data points
  across exams, with server-side language validation
- **Doctor questions** — ready-to-use, context-aware questions for the next
  appointment
- **Ask AI** — chat about your own health data, with guardrails
- **Apple Health context** — resting heart rate, blood pressure, steps, and
  SpO₂ shown alongside lab values (read-only, never uploaded)
- Dark-first UI with haptic feedback, skeleton loading, and SVG sparklines

## What it is NOT

- Not a medical device
- Not a diagnostic tool
- Does not calculate clinical risk scores
- Does not recommend medication or treatment

Heartline is a **health literacy tool** — it helps you have better
conversations with your doctor, not replace them. In a health product, scope
restraint is a feature: these limits are documented, encoded in the language
rules below, and enforced server-side.

## Technical highlights

For anyone arriving from a CV, the 60-second version:

- **The AI never classifies.** Attention levels come from deterministic pure
  functions ([`lib/scoring.ts`](lib/scoring.ts)): range-type-aware severity
  and proximity (bounded, max-only, min-only ranges are scored differently),
  trend across readings, and family history. The LLM explains and asks
  questions — classification is code, reviewable and testable.
- **Server-side guardrails on language.** Every AI output is validated in the
  Edge Function against forbidden clinical words ("risco", "diagnóstico",
  imperative "deves"…) and replaced with a deterministic fallback when
  validation fails. The app's language rules are enforced, not hoped for.
- **Privacy by architecture.** Exam photos are never stored: compressed
  on-device, sent to an Edge Function, discarded — only user-confirmed values
  persist. Row Level Security on all five tables; the Gemini API key exists
  only in Edge Function secrets; GDPR consent sheet before the first exam.
- **Reference ranges from the source.** Scoring uses the lab's own reference
  ranges, extracted from the report next to each value and editable at
  confirmation — because ranges differ between labs. A curated list of 15
  common biomarkers powers manual entry.
- **Native modules with graceful degradation.** HealthKit is lazy-required
  behind an execution-environment check, so the app still runs in Expo Go
  (where NitroModules crash at import time); Apple and Google Sign-In degrade
  the same way. One codebase, three run targets.
- **Human-in-the-loop by design.** AI extraction carries a confidence level
  per value and nothing reaches the database without the user confirming it.

## How it works

```
photo / PDF
   │  compressed on-device (never uploaded as-is, never stored)
   ▼
Edge Function: extract-exam ──► Gemini 2.5 Flash
   │  values + units + lab reference ranges + per-value confidence
   ▼
Confirmation screen — user reviews and edits every value
   ▼
Supabase Postgres (exams, biomarkers) — Row Level Security
   ▼
lib/scoring.ts — deterministic attention level per biomarker
   ▼
Edge Functions: generate-narrative · generate-questions · ask-question
   │  output validated against forbidden words, fallback if it fails
   ▼
Dashboard · biomarker detail · analysis + chat
```

## Data & storage

| Data | Comes from | Lives in |
|---|---|---|
| Biomarker values, units, ranges | Gemini extraction from the photo/PDF, confirmed by the user — or manual entry | `biomarkers` table (Postgres, RLS) |
| Exam photos / PDFs | Camera, gallery, or file picker | **Nowhere** — processed in memory and discarded |
| Profile + family history | 7-step onboarding | `profiles`, `family_history` (RLS) |
| AI narrative, questions, chat | Edge Functions (cached to avoid re-generation) | `generated_content` (RLS) |
| Health metrics (HR, resting HR, blood pressure, steps, SpO₂) | Apple HealthKit, read-only (7/30-day windows) | On device only — never uploaded |
| Reference defaults for manual entry | 15 curated common biomarkers | [`constants/biomarkers.ts`](constants/biomarkers.ts) |

Notes:

- **Gemini 2.5 Flash** is called exclusively from four Deno Edge Functions
  (`extract-exam`, `generate-narrative`, `generate-questions`,
  `ask-question`) — the API key never ships in the app, and rate limits are
  surfaced to the user as a friendly retry message.
- **HealthKit** is requested with read-only entitlements
  (`NSHealthUpdateUsageDescription: false`): heart rate, resting heart rate,
  blood pressure, step count, and oxygen saturation. The data stays on the
  device as dashboard context.
- **Row Level Security** means every query is scoped to `auth.uid()` at the
  database level — a compromised client still cannot read another user's rows.

## Scoring system

Four attention levels, determined by reference-range type + trend + family
history:

| Level | Color | Meaning |
|-------|-------|---------|
| Dentro do esperado | Green | Within reference range |
| A acompanhar | Amber | Near the edge or trending up |
| Merece atenção | Orange | Borderline + family history or rising trend |
| Fora do range | Red | Outside reference range |

Mechanics: **severity** measures how far outside the range a value is
(normalized to the range width), **proximity** how close to the edge a
within-range value sits, and **trend** compares readings over time (>10 %
change). Family history escalates borderline cases. All of it is plain
TypeScript in [`lib/scoring.ts`](lib/scoring.ts) — no AI in the loop.

## Language rules

The app follows strict language guidelines (Portuguese, Portugal):

- Never uses "risco", "diagnóstico", "normal/anormal"
- Uses "contexto", "merece atenção", "dentro do range de referência"
- Uses "vale a pena", "faz sentido" instead of "deves", "precisas"
- AI outputs are validated server-side for forbidden words, with
  deterministic fallbacks

## Tech stack

- **React Native** with **Expo SDK 54** (managed workflow, New Architecture)
- **TypeScript** throughout, including the Deno Edge Functions
- **Expo Router** (file-based routing, typed routes)
- **NativeWind** (Tailwind CSS for React Native)
- **Supabase** (PostgreSQL + Auth + Row Level Security + Edge Functions)
- **Google Gemini 2.5 Flash** via Edge Functions (API keys never in the app)
- **react-native-svg** for sparklines and charts
- **expo-haptics** for tactile feedback throughout

## Getting started

### Prerequisites

- Node.js 18+
- Supabase project with the schema from `supabase/migrations/`
- One of:
  - **Expo Go** on your iPhone (quickest, but some features disabled — see below)
  - **Xcode** for the iOS simulator or a dev client build (full feature set)

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Running in Expo Go (quickest)

This project has `expo-dev-client` installed, so `npx expo start` defaults to
dev-client mode (URL scheme `exp+heartline://`) — **Expo Go cannot open
that**. Force Expo Go mode with `--go`:

```bash
npx expo start --go --clear
```

Then on the iPhone:

1. Make sure the phone is on the **same Wi-Fi** as the Mac.
2. Open the **Expo Go** app (modern iOS Expo Go has no QR scanner — iPhone
   Camera and Safari cannot open `exp://` URLs).
3. On Expo Go's Home tab, the running project appears automatically under
   **"Development servers"**. Tap it.
4. If it doesn't appear, tap the paste-URL button (bottom-right of Home) and
   paste `exp://<your-mac-ip>:8081` (the Metro terminal prints the IP).

**Features disabled in Expo Go** (require a dev client build):
- HealthKit (`@kingstinct/react-native-healthkit`)
- Google Sign-In (`@react-native-google-signin/google-signin`)
- Apple Sign-In (`expo-apple-authentication`)

The rest of the app (email/password auth, adding exams, dashboard, AI
narrative) works fine for iterating on UI and logic.

### Running in the iOS simulator

Full feature set, no phone needed. Requires Xcode.

```bash
npm run ios
```

First build takes 5–10 minutes; subsequent runs are fast. You can also press
`i` in the Metro terminal to open the simulator.

### Running a dev client on a physical device

Full feature set on your real phone. Requires an EAS account:

```bash
npx eas-cli build --profile development --platform ios
```

Install the resulting build via TestFlight or Apple Configurator. Then
`npx expo start` (no `--go`) and the dev client opens the project
automatically.

### Deploy Edge Functions

```bash
npx supabase functions deploy generate-narrative --no-verify-jwt
npx supabase functions deploy generate-questions --no-verify-jwt
npx supabase functions deploy extract-exam --no-verify-jwt
npx supabase functions deploy ask-question --no-verify-jwt
```

## Project structure

```
app/                          # Expo Router screens
├── (auth)/                   # Login, register, welcome, forgot-password
├── (onboarding)/             # Profile (7 steps) + family history
├── (tabs)/                   # Dashboard, add-exam, settings, all-biomarkers
├── analysis.tsx              # Full AI analysis + chat
├── biomarker/[id].tsx        # Biomarker detail with range bar + evolution chart
└── _layout.tsx               # Root layout with auth flow + splash screen

components/                   # Reusable components
├── ui/                       # Button, Card, Input, DatePicker, Skeleton
├── sparkline.tsx             # Mini SVG trend chart
├── biomarker-row.tsx         # Biomarker card with scoring
└── attention-badge.tsx       # Color-coded attention level badge

hooks/                        # Custom hooks
├── useAuth.ts                # Supabase auth state
├── useProfile.ts             # Profile + family history
├── useBiomarkers.ts          # Biomarkers with scoring
├── useHealthKit.ts           # Apple Health (lazy-loaded native module)
└── useGeneratedContent.ts    # AI narrative + questions (cached)

lib/                          # Core logic
├── supabase.ts               # Supabase client
├── scoring.ts                # Deterministic scoring (range-type aware)
├── ai.ts                     # Edge Function calls
└── types.ts                  # TypeScript interfaces

supabase/
├── migrations/               # Schema: 5 tables, all with RLS
└── functions/                # Deno Edge Functions
    ├── extract-exam/         # AI: photo/PDF → biomarker values
    ├── generate-narrative/   # AI: personalized narrative (6 fields)
    ├── generate-questions/   # AI: doctor questions
    └── ask-question/         # AI: chat about your data
```

## App flow

```
First visit:    Splash → Welcome (3 slides) → Register → Onboarding → Dashboard
Returning user: Splash → Dashboard
Logged out:     Splash → Login → Dashboard
```

## License

Proprietary. All rights reserved.
