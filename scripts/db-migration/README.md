# DB Migration Runbook (Slot-Based)

Quick cutover checklist:

- [docs/DB_SLOT_SWITCH_CHECKLIST.md](../../docs/DB_SLOT_SWITCH_CHECKLIST.md)

Slot model:

- Slot `1`: existing unsuffixed keys (`DATABASE_URL`, `DATABASE_URL_ADMIN`, ...)
- Slot `N` (`2+`): suffixed keys (`DATABASE_URL_N`, `DATABASE_URL_ADMIN_N`, ...)
- Active runtime slot: `ACTIVE_DB_SLOT`

Files:

- `db-slot-setup-wizard.ts` (interactive setup for one slot)
- `db-migrate-wizard.ts` (interactive copy from slot -> slot)
- `enable_rls.sql`

## Recommended flow

### 1) Setup a new slot (2/3/4...)

```bash
bun run db:new
```

This wizard:

1. asks target slot index
2. asks new owner URL
3. generates `*_N` keys into a temp env file
4. optionally bootstraps schema + RLS on that new DB

### 2) Migrate from one slot to another

```bash
bun run db:migrate
```

This wizard:

1. reads `.env` + process env
2. asks source (slot number or pasted postgres URL)
3. asks target (slot number or pasted postgres URL)
4. runs data copy and post-copy verification
5. if target is a slot, optionally updates local `.env` `ACTIVE_DB_SLOT=<target>`

### 3) Verify source/target are in sync

```bash
bun run db:verify --source-slot=1 --target-slot=2
```

This uses the exact same key-table count comparison used by `db:migrate` post-copy.
Input can be slot numbers or pasted postgres URLs.

## Supported commands

Use only:

```bash
bun run db:new
bun run db:migrate
bun run db:verify
```

Minimum credentials needed:

- `db:migrate`: `DATABASE_URL_OWNER[_N]` preferred, or `DATABASE_URL_ADMIN[_N]` fallback for slot selections
- `db:migrate`: source URL + target URL if you paste URLs directly (optional target owner URL for schema push)
- `db:verify`: source URL + target URL (slot-derived or pasted)

## Deployment notes

1. Keep runtime on the current slot until copy is complete and validated.
2. If the target slot is new, configure its credentials once: the owner/admin URLs in
   GitHub Environment secrets and the app/admin/stats URLs in Cloudflare Pages. No
   credential changes are needed for later switches between configured slots. The
   workflow uploads the selected admin URL to the Worker.
3. For each cutover, change only the GitHub Environment variable
   `ACTIVE_DB_SLOT=<target-slot>` and run its workflow. It updates the corresponding
   Pages and Worker runtime slot values, then deploys. The Worker's slot is a text
   variable passed to `wrangler deploy`; its database URL remains a secret.
   Staging uses the shared Pages preview configuration, which affects all preview branches.
4. Re-enable writes/worker after successful cutover.
