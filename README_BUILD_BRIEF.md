# Travel Buddy v2 Build Brief

Build a single-user executive travel app that acts like the business-travel version of Italy 2026: operational, saved-state-first, dark by default, and built for real trip decisions rather than a static planner.

## Product principles

- Fare watching is the killer feature. Chat is a control surface.
- Premium cabin research must always include coach reimbursement context.
- Avoid the word "delta" in UI labels because Delta Air Lines is also a carrier.
- Use memberships actively in recommendations: Emirates Skywards, Virgin Atlantic Flying Club, Delta SkyMiles, United MileagePlus, American AAdvantage, JetBlue TrueBlue, British Airways Executive Club, Air France-KLM Flying Blue, Qatar Privilege Club.
- Be honest that fares from Tavily are research leads, not bookable inventory.
- No hotels, rail, booking, auth, login, GDS, Amadeus, caches, rate limiters, or mobile app in v1.

## V1 done criteria

- Schema created and user 1 seeded.
- Profile and memberships editable.
- Search works against Tavily when configured, with deterministic demo fallback when not configured.
- Coach reimbursed, premium fare, and your out-of-pocket are shown for every normalized result.
- Watch can be created from UI or chat.
- Watch check-now works.
- Cron runs every four hours and records hits below max price.
- Chat works with `search_flights`, `create_watch`, `get_watched_routes`, `get_memberships`, and `check_watch_now`.
- Notification interface supports console by default and Gmail SMTP when `GMAIL_USER` plus `GMAIL_APP_PASSWORD` are present and email alerts are enabled in Profile. Resend, Twilio, and Slack remain optional.
- Build passes.
