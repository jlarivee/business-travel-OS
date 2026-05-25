# Business Travel OS

Single-user Replit app for executive business travel research, premium fare watching, coach reimbursement comparison, membership-aware recommendations, and lightweight itinerary building.

## Core idea

The main product is the watch loop: active routes are checked every four hours, research results are normalized, and qualifying premium cabin deals are saved with a clear coach reimbursement baseline and personal out-of-pocket amount.

## Stack

- Node 20, Express
- React 18 with Vite
- Tailwind CSS with shadcn-style local components
- Replit Postgres with Drizzle schema
- Anthropic SDK with tool use
- Tavily search for fare research
- Firecrawl-ready fallback seam
- node-cron for watch checks
- Resend and Twilio notification stubs

## Replit setup

Add these in Replit Secrets:

- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `TAVILY_API_KEY`
- Optional: `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `NOTIFY_EMAIL_TO`, `NOTIFY_SMS_TO`

Then run:

```bash
npm run install:all
npm run db:push
npm run start
```

For local development:

```bash
npm run install:all
npm run dev
```

## Reimbursement language

The app avoids using "delta" for airline ambiguity. Results show:

- Coach reimbursed
- Premium fare
- Your out-of-pocket
- Membership fit
- Research confidence

Fare results are research leads, not bookable inventory.
