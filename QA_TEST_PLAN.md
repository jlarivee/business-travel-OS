# QA Test Plan

## Backend

- `GET /api/health` returns configured service flags and cron state.
- First boot creates user profile for user 1 with home airports BDL, PVD, HVN, JFK, LGA, EWR, BOS and default cabin business.
- `GET /api/profile` returns profile, memberships, recent searches, watches, and daily reviews.
- Profile update persists home airports, default cabin, notify channels, and reimbursement notes.
- Membership create/update/delete persists tiers and notes.
- `POST /api/search/flights` accepts origin/destination/date/cabin/passengers and returns normalized research results.
- `POST /api/watches` creates an active watch.
- `POST /api/watches/:id/check-now` records qualifying watch hits.
- Cron check function can run without crashing when Tavily is missing.
- `POST /api/chat` can call all tool handlers and persists full tool-use history.

## Frontend

- Command Center shows watch stats, latest hits, daily review, and top executive recommendations.
- Watches page supports create, pause/resume, check now, and hit review.
- Profile page edits airports, default cabin, reimbursement policy, notify channels, and memberships.
- Chat page streams/returns concise direct responses and tool results.
- Mobile layout keeps bottom navigation usable and avoids overlarge hero panels.

## Acceptance

- `npm run build` succeeds.
- `npm run smoke` passes against a running local server or Replit server.
- No secret values are logged.
- UI copy says "Coach reimbursed", "Premium fare", and "Your out-of-pocket", never "delta".
