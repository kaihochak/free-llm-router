# DB Slot Switch Checklist

Use this when moving runtime traffic between slots `1` and `2`.

This is the short operator checklist. For wizard details, see `scripts/db-migration/README.md`.

## 1. Prepare Target Slot

- Run:

```bash
bun run db:new
```

- Confirm the target slot has its four role URLs. Slot 1 uses unsuffixed names; slot 2 uses `_2` suffixes.

- Keep runtime on the old slot for now:
  - leave `ACTIVE_DB_SLOT` set to the current source slot

## 2. Copy Data

- Run:

```bash
bun run db:migrate
```

- Copy from old slot to new slot.
- If prompted, truncating clears **all public-table data in the target slot** before the copy. Confirm the source and target direction before accepting.
- Do **not** switch runtime yet.

## 3. Verify Copy

- Run:

```bash
bun run db:verify --source-slot=<source> --target-slot=<target>
```

- Confirm key-table counts are acceptable for cutover.
- If counts do not match as expected, stop here and re-run copy / inspect drift.

## 4. Freeze Writes (Recommended)

Before cutover, pause anything that writes to the old slot:

- sync worker
- admin/manual sync triggers
- write-heavy app flows if needed

Goal:

- avoid old-slot/new-slot drift during the cutover window

## 5. Confirm Target Slot Is Configured

These URLs are one-time setup for a new slot, not values to change at every cutover.
If both slots are already configured, only change GitHub's `ACTIVE_DB_SLOT` in step 6.

### Cloudflare Pages

- Keep both slots' URLs in the correct Pages environment when both slots exist (production for `main`, preview for `staging`):
  - Slot 1: `DATABASE_URL`, `DATABASE_URL_ADMIN`, `DATABASE_URL_STATS`
  - Slot 2: `DATABASE_URL_2`, `DATABASE_URL_ADMIN_2`, `DATABASE_URL_STATS_2`
- Pages also has `ACTIVE_DB_SLOT`. The workflow sets it to the GitHub Environment's selected slot; Pages uses the matching URL set at runtime.

### Cloudflare Worker (`workers/sync-models`)

- The workflow uploads the selected slot's admin URL from GitHub secrets before switching the Worker. No manual Worker URL change is needed for cutover.
- The Worker also has `ACTIVE_DB_SLOT`. The workflow sets it to the GitHub Environment's selected slot; the hourly sync writes to that slot.
- If an environment has only slot 1 (such as staging before slot 2 is created), its `_2` URL can be added later.

### GitHub Actions

- Store `ACTIVE_DB_SLOT` in the corresponding GitHub Environment (`production` or `staging`); this is the only value to change for a cutover between configured slots.
- Store owner URLs as `DATABASE_URL_OWNER` (slot 1) and `DATABASE_URL_OWNER_2` (slot 2).
- Store Worker admin URLs as `DATABASE_URL_ADMIN` (slot 1) and `DATABASE_URL_ADMIN_2` (slot 2).
- The selected slot's owner and admin secrets are required. For example, staging on slot 1 does not need slot 2 secrets yet.
- The Cloudflare API token needs Pages Write and Workers Scripts Write access, and `CLOUDFLARE_ACCOUNT_ID` must be available to the Pages job.

## 6. Deploy

- Run the appropriate GitHub workflow (`Production Checks + Migrations` or `Staging Checks + Migrations`) after setting the GitHub Environment variable.
- The workflow pushes the schema to the selected slot, verifies that the matching Pages database URLs exist, sets Pages `ACTIVE_DB_SLOT`, deploys Pages, provisions the Worker's selected admin URL and `ACTIVE_DB_SLOT`, and deploys the Worker.
- Staging uses the shared Pages project's **preview** configuration. A change there applies to all preview deployments of that project, not just the `staging` branch.

After deploy:

- app runtime and Worker should both use the selected slot

## 7. Post-Cutover Checks

Check:

- app loads normally
- `/api/v1/models/ids` returns expected active free model IDs
- availability page loads
- sync worker logs show successful syncs
- newly synced models update in the target slot

Recommended spot checks:

- one model that is definitely still free
- one model that is definitely no longer free
- one API key request using saved preferences

## 8. Rollback

If cutover is bad:

- Set the appropriate GitHub Environment's `ACTIVE_DB_SLOT` back to the previous slot.
- Run that environment's workflow again. It updates Pages, the Worker, and the schema target from the same setting.
- Verify both runtime surfaces after rollback. Data written after the copy may need reconciliation before switching back.

## 9. Rules to Remember

- Do not switch runtime before copy + verification are complete.
- `:free` and non-`:free` model IDs are distinct in this app.
- Free-model truth comes from OpenRouter `/api/v1/models`, not the website model page.
