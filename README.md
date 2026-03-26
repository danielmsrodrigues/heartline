# Heartline

A native iOS app that helps anyone understand their clinical exams in an integrated, longitudinal, and personalized way.

## What it does

Heartline crosses all your exam data over time — with family history and lifestyle — and explains what the **combination** of your data suggests, in clear language with concrete actions.

- **Photograph or import** clinical exams (photos/PDFs)
- **AI extraction** of biomarker values using Gemini 2.5 Flash
- **Deterministic scoring** — 4 attention levels based on reference ranges, trends, and family history
- **Personalized narrative** — AI-generated insights that connect your data points
- **Doctor questions** — ready-to-use questions for your next appointment
- **Ask AI** — chat about your health data with context-aware responses

## What it is NOT

- Not a medical device
- Not a diagnostic tool
- Does not calculate clinical risk scores
- Does not recommend medication or treatment

Heartline is a **health literacy tool** — it helps you have better conversations with your doctor, not replace them.

## Tech stack

- **React Native** with **Expo SDK 54** (managed workflow)
- **TypeScript**
- **Expo Router** (file-based routing)
- **NativeWind** (Tailwind CSS for React Native)
- **Supabase** (PostgreSQL + Auth + Storage + Row Level Security + Edge Functions)
- **Google Gemini 2.5 Flash** via Supabase Edge Functions (API keys never in the app)
- **react-native-svg** for sparklines and charts
- **expo-haptics** for tactile feedback throughout

## Getting started

### Prerequisites

- Node.js 18+
- Expo Go app on your iOS device
- Supabase project with the schema from `CLAUDE.md`

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# Start the dev server
npx expo start --clear
```

Scan the QR code with your iPhone camera to open in Expo Go, or enter the URL manually: `exp://<your-ip>:8081`

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
└── useGeneratedContent.ts    # AI narrative + questions (cached)

lib/                          # Core logic
├── supabase.ts               # Supabase client
├── scoring.ts                # Deterministic scoring (range-type aware)
├── ai.ts                     # Edge Function calls
└── types.ts                  # TypeScript interfaces

supabase/functions/           # Deno Edge Functions
├── extract-exam/             # AI: photo/PDF → biomarker values
├── generate-narrative/       # AI: personalized narrative (6 fields)
├── generate-questions/       # AI: doctor questions
└── ask-question/             # AI: chat about your data
```

## App flow

```
First visit:    Splash → Welcome (3 slides) → Register → Onboarding → Dashboard
Returning user: Splash → Dashboard
Logged out:     Splash → Login → Dashboard
```

## Scoring system

Four attention levels, determined by reference range type + trend + family history:

| Level | Color | Meaning |
|-------|-------|---------|
| Dentro do esperado | Green | Within reference range |
| A acompanhar | Amber | Near the edge or trending up |
| Merece atenção | Orange | Borderline + family history or rising trend |
| Fora do range | Red | Outside reference range |

## Language rules

The app follows strict language guidelines (Portuguese, Portugal):

- Never uses "risco", "diagnóstico", "normal/anormal"
- Uses "contexto", "merece atenção", "dentro do range de referência"
- Uses "vale a pena", "faz sentido" instead of "deves", "precisas"
- AI outputs are validated server-side for forbidden words

## License

Proprietary. All rights reserved.
