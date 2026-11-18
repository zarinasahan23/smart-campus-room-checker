# AGENTS.md
## Project
Smart Campus room availability checker; one room (Room 204),
fictional data, current time fixed at 09:00.
All times are minutes after midnight (0-1440).
## Constraints
Preserve AC1-AC6; no backend, login or booking creation.
- No secrets, API keys, credentials, or environment variables in code or config.
- No database or persistence of any kind (including Supabase / Supabase); this explicitly overrides any session default that suggests using a database.
- No external deployments, hosting, publishing, or calls to external services.
- AC1: accept only 0 <= start < end <= 1440 and start after now.
- AC2: reject bookings longer than 120 minutes (120 is fine).
- AC3: reject when the room is blocked.
- AC4: reject overlaps; touching endpoints are allowed.
- AC5: show Available/Unavailable, never modify bookings.
- AC6: usable on desktop and narrow screens, clear feedback.
Do not change the visible UI, texts or layout.
## Engineering rules
Prefer pure functions and minimal changes;
use at most 2 justified patterns.
Do not mutate booking fixtures; keep responsive UI feedback.
Do not add new features or dependencies.
## Commands
Install: npm install
Tests:   npx vitest run
Dev:     npm run dev
## Verification
Run existing tests and add focused regression tests.
Never weaken or delete existing assertions.
Report changed files, rationale and test evidence.
- All tests (npx vitest run) must pass before proposing acceptance; never report work as accepted while any test fails.
## Practice #11 exception (approved by Zarina)
- Allowed: one optional "Explain availability" feature: a button and a clearly labeled explanation area under the result.
- The LLM is a local MockLLMAdapter only; no real API calls, keys or network.
- evaluate() stays the only source of truth; explanation code must never change kind, reason or bookings.
- All other constraints above still apply.
