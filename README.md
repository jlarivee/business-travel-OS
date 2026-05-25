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

Add only these required Replit Secrets for v1:

- `DATABASE_URL`
- `APP_USERNAME`
- `APP_PASSWORD`
- `JWT_SECRET`
- `ANTHROPIC_API_KEY`
- `TAVILY_API_KEY`

You do not need these for v1: `FIRECRAWL_API_KEY`, `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `NOTIFY_EMAIL_TO`, `NOTIFY_SMS_TO`, `SLACK_WEBHOOK_URL`. They are optional hooks for fallback scraping and real notifications later. If they are missing, the app still runs and logs notification stubs.

### Gmail alerts

To use your Gmail account for fare alerts, add these Replit Secrets:

- `GMAIL_USER`: your full Gmail address
- `GMAIL_APP_PASSWORD`: a Google app password, not your normal Gmail password
- `NOTIFY_EMAIL_TO`: where alerts should go; if omitted, the app sends to `GMAIL_USER`
- `GMAIL_FROM_NAME`: optional sender name, defaults to `Business Travel OS`

Then open the app Profile page and turn on the `email` notification channel. Google requires app passwords for this kind of SMTP sign-in when using a personal Gmail account.

Then run:

```bash
npm run install:all
npm run db:push
npm run start
```

`APP_USERNAME` and `APP_PASSWORD` protect the deployed app with a single-user login. `JWT_SECRET` signs the private browser session cookie. If `APP_PASSWORD` is missing in production, all private APIs stay locked.

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
