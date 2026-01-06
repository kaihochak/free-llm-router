# Rate Limiting (User-Level)

## Summary
API usage is enforced per user rather than per API key. All keys owned by a user share a single
200 requests / 24 hours limit. This prevents bypassing limits by deleting keys and creating new ones.

## Behavior
- Each authenticated request to protected model endpoints increments a user-level counter.
- The limit is enforced as a rolling 24-hour window based on the user's last request time.
- When the window expires, counters reset on the next request.
- Feedback submissions do not affect rate limits.

## Data Model
User-level rate limit fields live on the `users` table:
- `request_count` (integer, default 0)
- `remaining` (integer, default 200)
- `last_request` (timestamp, nullable)
- `rate_limit_max` (integer, default 200)
- `rate_limit_time_window` (integer, default 86400000)

The `api_keys` table still contains per-key rate limit fields from Better Auth's plugin schema,
but those fields are not used for enforcement.

## Enforcement Flow
1) API key is validated by hashing the token using Better Auth's base64url SHA-256 format.
2) The key is matched against `api_keys.key` and validated for status/expiry.
3) User-level rate limits are updated with a single SQL update on the `users` row.
4) Rate limit headers are returned on successful responses and 429 responses.

## Endpoints
Protected:
- `GET /api/v1/models/full`
- `GET /api/v1/models/ids`

Unlimited:
- `POST /api/v1/models/feedback` (uses `validateApiKeyOnly`)

Dashboard:
- `GET /api/auth/rate-limit` returns `remaining`, `limit`, `requestCount`, `lastRequest`.

## Headers
Responses may include:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset` (epoch seconds)
- `Retry-After` (on 429)

## UI
The dashboard displays a single shared usage card and lists API keys without per-key usage.

## Configuration
Defaults are set in `src/db/auth-schema.ts`:
- `rate_limit_max = 200`
- `rate_limit_time_window = 86400000`

## Verification
1) Use one key to exhaust the limit.
2) Create a new key and confirm it is still rate-limited.
3) Use another key to check shared remaining count.
4) Submit feedback and confirm it succeeds while still rate-limited.
