# DB Slot Switch Runbook

Use this for each production switch between existing slots 1 and 2. For first-time
slot creation and wizard details, see [the migration README](../scripts/db-migration/README.md).

The repeat operation is: identify → pause writes → copy → verify → change one GitHub
variable and deploy → verify Cloudflare → smoke-test and resume writes. The agent
prints these steps and their commands; the operator runs the commands unless they
explicitly ask the agent to run a named phase. Do not use local `.env`
`ACTIVE_DB_SLOT` to infer production; it may be different.

## 1. Identify source and target

From the repository, read the `production` GitHub Environment variable:

```bash
gh variable get ACTIVE_DB_SLOT --env production
```

Find the most recent successful production workflow run and inspect its final
**Verify DB slot in GitHub, Pages, and Worker** output:

```bash
gh run list --workflow prod.yml --status success --limit 1
gh run view RUN_ID --log | rg 'DB slots: GitHub=[12] Pages=[12] Worker=[12]'
```

Replace `RUN_ID` with the ID shown by `gh run list`. The log proves what the
workflow read at that run, not necessarily the live state now. If its value differs
from GitHub's current variable, the run is stale, or Cloudflare was changed
afterward, run the live Cloudflare readback in step 6 **before** copying. Do not
assume a match from an old log. If access to the production Cloudflare account is
unavailable, report that the live values are unconfirmed.

- Source = the slot currently serving production. Target = the other configured slot.
  For a switch from 1 to 2, use `--source-slot=1 --target-slot=2`. Reverse those
  arguments for a switch from 2 to 1. Never accept a wizard default based on a
  stale local `.env`.
- Confirm the target's role URLs exist. If it is a new slot, complete the one-time
  setup below first.

## 2. Freeze writes before copying

Ask the operator: **Have you paused production writes?** They must pause the hourly
sync Worker, manual/admin syncs, and application write flows (feedback, auth, API
request logs), then confirm. There is no automated write-freeze command in this
repository; the migration wizard's question is advisory. Do not proceed on an
assumed pause. Keep writes paused through verification and deployment.

## 3. Copy into the target

For source 1 → target 2:

```bash
bun run db:migrate --source-slot=1 --target-slot=2
```

For the reverse switch, use `--source-slot=2 --target-slot=1`.

- Read the displayed source/target plan before confirming. The target normally
  contains an old copy. When prompted, **truncating deletes all public-table data
  on the target**, then the wizard copies source data into it. The wizard first
  writes a complete temporary source dump; truncate and restore run in one target
  transaction, so a failed restore rolls back the truncate and copy. Rollback
  preserves the target's pre-attempt state, even if it was already incomplete.
  Preserve the old target separately first if its data is needed. Never truncate
  the source.
- The wizard performs a post-copy key-table check. Treat any mismatch or `ERR`
  as a stop; do not switch traffic.
- The optional local `.env` change affects only local commands, not production.

## 4. Verify the copy

Run the read-only comparison with the same direction:

```bash
bun run db:verify --source-slot=1 --target-slot=2
```

Reverse the arguments for 2 → 1. Continue only if all key-table counts are numeric
and match. Have the operator share the copy and verification results before cutover.

## 5. Switch in GitHub and deploy

Only after step 4 passes, set **only** the `production` GitHub Environment variable
to the target slot and dispatch **Production Checks + Migrations**. Example for
target 2 (use `--body 1` when switching back to slot 1):

```bash
gh variable set ACTIVE_DB_SLOT --env production --body 2
gh variable get ACTIVE_DB_SLOT --env production
gh workflow run prod.yml --ref main
```

The workflow pushes schema to the selected slot, sets Pages production's
`ACTIVE_DB_SLOT`, deploys Pages, uploads the selected Worker admin URL, and deploys
the Worker with its `ACTIVE_DB_SLOT` text variable. Do not separately edit Pages or
Worker slot values or use `wrangler secret put ACTIVE_DB_SLOT`; that name is a text
binding, not a secret.

## 6. Verify Cloudflare after deployment

Get the newly dispatched run ID, wait for success, and inspect its final check:

```bash
gh run list --workflow prod.yml --event workflow_dispatch --limit 5
gh run watch RUN_ID --exit-status
gh run view RUN_ID --log | rg 'DB slots: GitHub=[12] Pages=[12] Worker=[12]'
```

Replace `RUN_ID` with the **new** run ID. The final line must show the target slot
for GitHub, Pages, and Worker. This is the workflow's live Cloudflare readback.
Wrangler is useful for an additional read-only Worker deployment inspection:

```bash
cd workers/sync-models
bunx wrangler deployments status --env production
bunx wrangler versions view VERSION_ID --env production
```

Use the active version ID from the status output; inspect its bindings for
`ACTIVE_DB_SLOT`. This requires access to the production Cloudflare account.
Wrangler's Pages commands do not provide the corresponding Pages project
environment-variable readback, so use the workflow's three-way check for Pages.
Do not run a Wrangler deploy as an extra slot-switch step.

If the live Cloudflare values must be checked independently (including before
step 2 when the last workflow check is stale), use the same API readback as the
workflow. First supply `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for the
**production** account in your shell; do not print or commit them. These commands
output only slot values, not database URLs:

```bash
curl -fsS "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/free-llm-router" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -er 'select(.success == true) | .result.deployment_configs.production.env_vars.ACTIVE_DB_SLOT | select(.type == "plain_text") | .value'
curl -fsS "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/free-llm-router-sync-production/settings" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq -er 'select(.success == true) | .result.bindings[] | select(.name == "ACTIVE_DB_SLOT" and .type == "plain_text") | .text'
```

## 7. Smoke-test and resume

Confirm the app loads, `/api/v1/models/ids` returns expected IDs, an API-key request
works, and the sync Worker logs are healthy. Resume writes and the hourly sync, then
check that new records land on the target slot. Verify or intentionally update local
`.env` `ACTIVE_DB_SLOT` separately; it is not part of the production switch.

If cutover fails, keep writes paused. Set GitHub `ACTIVE_DB_SLOT` back to the source
and rerun the production workflow. Reconcile any post-copy writes before treating
the two slots as interchangeable.

## One-time setup for a new slot

Run `bun run db:new` only when creating a slot. Slot 1 uses unsuffixed URL names;
slot 2 uses `_2`. Configure the target's owner/admin URLs in GitHub Environment
secrets, and its app/admin/stats URLs in Cloudflare Pages production. The workflow
uploads the selected admin URL as a Worker secret and sets its `ACTIVE_DB_SLOT` as
a text variable. No URL changes are needed for later switches between configured
slots. Staging uses its own GitHub Environment and the shared Pages preview
configuration; switching preview affects all preview branches of this Pages project.
