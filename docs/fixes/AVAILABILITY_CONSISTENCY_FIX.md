# Availability Consistency Fix Report

Date: 2026-08-31

## Summary

Retired OpenRouter models continued to appear as currently free on the homepage, health page, dashboard configuration, provider pages, sitemap, and model APIs. The availability matrix and individual model pages correctly showed that the same models were no longer free.

`openrouter/owl-alpha` was used to reproduce and verify the issue.

The fix establishes one current-state rule: a model is currently free when `free_models.is_active` is `true`. The OpenRouter `/api/v1/models` response is the external source of truth that updates this flag. `last_seen_at` and availability snapshots remain historical evidence and do not independently determine current status.

## User-Visible Symptoms

Before the fix:

- The Owl Alpha detail page displayed `No longer free`.
- Its recent availability history contained no positive sightings.
- Owl Alpha still appeared in the active model API.
- It was included in homepage and dashboard model lists.
- Historical feedback caused it to appear in the health list and chart.

Different product surfaces were using different interpretations of current availability.

## Root Cause

The application sync included a count-based safeguard intended to protect against a partial OpenRouter response. Missing models were deactivated only when the returned free-model count was at least half of the models already stored.

The stored count included historical models. As retired models accumulated, the denominator grew while the legitimate free-model set could shrink. Eventually, valid sync responses no longer passed the threshold, so missing models were never marked inactive.

On 2026-08-31, the observed state was:

- 395 total models in the current OpenRouter response
- 21 models classified as free
- 52 remote database rows incorrectly marked active

A second attempted safeguard compared the returned free-model count with rows currently marked active. It still rejected the valid response because 21 was less than half of 52. This demonstrated that free-model counts cannot determine whether the complete response is trustworthy.

## Source-of-Truth Decision

The final design separates current state from historical and operational data:

| Data                           | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| OpenRouter `/api/v1/models`    | External authority for the latest model set              |
| `free_models.is_active`        | Sole persisted answer to “is this model currently free?” |
| `free_models.last_seen_at`     | Audit and display timestamp                              |
| `model_availability_snapshots` | Historical positive sightings                            |
| `sync_meta`                    | Sync freshness and operational monitoring                |

All current-model consumers filter on `is_active`. Availability snapshots are used for timelines and last-seen history, not as an alternative current-state calculation.

## Response Validation

The number of free models is not a validity signal. A legitimate response can contain substantially fewer free models than the previous response, including zero.

The sync trusts a response when:

- OpenRouter returns a successful HTTP response.
- The JSON payload contains a `data` array.
- Every entry has a non-empty `id` and `name`.
- Every entry has finite numeric prompt and completion prices, which are the fields required to classify it as free or paid.
- Model IDs are unique within the response.

The sync leaves existing active state unchanged when the request fails, the HTTP status is unsuccessful, the payload is malformed, or a model entry is invalid.

Response types, validation, and free-pricing classification live in `shared/openrouter-models.ts`. Both the application sync and Cloudflare worker import this module so their source-of-truth rules cannot diverge.

## Synchronization Behavior

For every valid response:

1. Filter the returned models using the free-pricing rule.
2. In one transaction, upsert every free model with `is_active = true`, update its `last_seen_at`, deactivate every stored model absent from the free set, and update the normal synchronization timestamp.
3. Record positive availability snapshots for models observed as free. These historical writes do not determine current state.

A valid response with zero free models skips the upsert and snapshot operations and sets every active model to inactive.

Inactive records are retained. If OpenRouter later returns a model as free again, the next valid sync upserts the existing row, changes `is_active` back to `true`, and updates `last_seen_at`.

## Consistent Consumers

The canonical active flag is used by:

- active model APIs
- homepage and dashboard model lists
- health summaries and timelines
- provider model lists and provider discovery
- related and similar model recommendations
- model detail current-status messaging
- availability current/no-longer-free filters
- sitemap generation through the active-model service

Historical health records are not deleted. Feedback for retired or unknown model IDs remains stored but is excluded from current health responses.

## Verification

Before the final simplification, the patched application was tested against the remote database to confirm the stale-state diagnosis:

| Check                              | Stale remote state | Expected after authoritative sync |
| ---------------------------------- | -----------------: | --------------------------------: |
| Models marked active               |                 52 |                                21 |
| Owl Alpha in active models         |                Yes |                                No |
| Models with current health reports |                 39 |                                19 |
| Owl Alpha in health                |                Yes |                                No |

Automated regression coverage verifies that:

- a structurally valid empty `data` array is accepted
- entries with valid identity and pricing fields are accepted
- payloads without a `data` array are rejected
- entries without required identity or pricing fields are rejected
- duplicate model IDs are rejected

## Rollout

Both the application and the scheduled sync worker must be deployed. The first successful valid sync repairs existing stale `is_active` values.

After rollout, verify:

1. `/api/v1/models/ids` and `/api/v1/models/full` exclude Owl Alpha.
2. `/api/health` excludes Owl Alpha.
3. The homepage and dashboard show the same current-model set.
4. The Owl Alpha detail page remains accessible as historical information.
5. The availability page continues to show its last positive sighting.
6. A test model can move from active to inactive and back to active without deleting its record.

## Files Changed

- `src/services/openrouter.ts`
- `shared/openrouter-models.ts`
- `src/pages/models/[...slug].astro`
- `src/components/model-availability/AvailabilityMatrix.tsx`
- `workers/sync-models/src/index.ts`
- `workers/sync-models/tsconfig.json`
- `tests/api/model-sync-policy.test.ts`
- `docs/AVAILABILITY.md`
- `docs/fixes/AVAILABILITY_CONSISTENCY_FIX.md`
