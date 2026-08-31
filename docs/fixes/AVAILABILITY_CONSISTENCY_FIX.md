# Availability Consistency Fix Report

Date: 2026-08-31

## Summary

Retired OpenRouter models continued to appear as currently free on the homepage, health page, dashboard configuration, provider pages, sitemap, and model APIs. The availability matrix and individual model pages correctly showed that the same models were no longer free.

`openrouter/owl-alpha` was the model used to reproduce and verify the issue.

The inconsistency had two causes:

1. The synchronization safety check could permanently prevent old models from being marked inactive.
2. Most read paths trusted the stale `free_models.is_active` flag without checking whether the model participated in the latest complete sync.

The fix corrects both the write path and the read path. Historical model and feedback records remain available, but retired models are no longer presented as current free models.

## User-Visible Symptoms

Before the fix:

- The Owl Alpha detail page displayed `No longer free`.
- Its recent availability history contained no positive sightings.
- Owl Alpha still appeared in the active model API.
- It was included in homepage and dashboard model lists.
- Historical feedback caused it to appear in the health list and chart.

This made different parts of the product provide contradictory answers to the same question.

## Data Model

The affected state is represented across these records:

- `free_models.is_active` represents the current synchronized state.
- `free_models.last_seen_at` records the last sync in which the model was found as free.
- `model_availability_snapshots` retains positive daily sightings for historical displays.
- `sync_meta` records synchronization timestamps.

Availability pages used recent snapshots, while most other surfaces used only `is_active`. When that flag became stale, the two groups of pages diverged.

## Original Sync Failure

The application sync included a safeguard intended to protect against a partial OpenRouter response. Missing models were deactivated only when the returned free-model count was at least half of the models already stored.

The stored count included historical models. As retired models accumulated, the denominator grew while the legitimate free-model set could shrink. Eventually, valid sync responses no longer passed the threshold, so missing models were never marked inactive.

The first attempted correction compared the returned free-model count with rows currently marked active. Remote verification showed that this was still insufficient because the active flags were already corrupt.

On 2026-08-31, the observed state was:

- 395 total models in the current OpenRouter response
- 21 models classified as free
- 52 remote database rows incorrectly marked active

The active-row safeguard still rejected the valid response because 21 was less than half of 52.

## Final Design

### Full-feed completeness

Sync completeness is evaluated using the size of OpenRouter's complete model response rather than the size of its free subset. The total feed remains a useful integrity signal even when the number of free models drops sharply.

When the feed is considered complete, the sync:

1. upserts every currently free model
2. marks missing active models inactive
3. records `models_last_complete_updated` in `sync_meta`
4. writes the normal model-update timestamp and availability snapshots

An empty free set or suspiciously small complete feed does not trigger mass deactivation.

### Read-side freshness

Current-model queries now require both:

- `is_active = true`
- `last_seen_at` within the completion window of the latest complete sync

A 15-minute tolerance accounts for the time between individual model upserts and the final synchronization metadata update.

For databases created before `models_last_complete_updated` existed, the most recent successful sync timestamp is used as a compatibility fallback. This immediately suppresses historically stale active flags without requiring a manual database rewrite.

### Consistent consumers

The current-model condition is shared by:

- active model APIs
- homepage and dashboard model lists
- health summaries and timelines
- provider model lists
- related and similar model recommendations
- provider discovery
- model sitemap generation through the active-model service

Health records are not deleted. Feedback for retired or unknown model IDs is retained but excluded from current health responses.

### Scheduled worker parity

The Cloudflare synchronization worker applies the same full-feed completeness rule, records the complete-sync marker, and reports the number of models deactivated.

## Verification

The patched application was run locally against the same remote database that exhibited the bug.

| Check                      | Before | Patched |
| -------------------------- | -----: | ------: |
| Models returned as active  |     52 |      21 |
| Owl Alpha in active models |    Yes |      No |
| Models with health reports |     39 |      19 |
| Owl Alpha in health        |    Yes |      No |

The patched active-model count matched the 21 free models in the current OpenRouter feed.

Automated verification:

- 46 tests passed
- application TypeScript check passed
- worker TypeScript check passed
- targeted ESLint check passed with no new errors
- formatting check passed

Regression coverage includes:

- a valid sharp drop in the free-model subset
- an empty free-model response
- a suspiciously small complete response
- calculation of the current-model freshness cutoff

## Rollout

Both the application and the scheduled sync worker must be deployed.

The read-side freshness condition makes remote-backed application reads correct immediately after the application deployment. The next complete worker sync repairs the stale `is_active` values and creates the complete-sync marker for subsequent reads.

After rollout, verify:

1. `/api/v1/models/ids` and `/api/v1/models/full` exclude Owl Alpha.
2. `/api/health` excludes Owl Alpha.
3. The homepage and dashboard show the same current-model set.
4. The Owl Alpha detail page remains accessible as historical information.
5. The availability page continues to show its last positive sighting.

## Files Changed

- `src/services/openrouter.ts`
- `workers/sync-models/src/index.ts`
- `tests/api/model-sync-policy.test.ts`
- `docs/AVAILABILITY.md`
- `docs/AVAILABILITY_CONSISTENCY_FIX.md`
