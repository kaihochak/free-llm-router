# Database Row-Level Security (RLS)

This document describes the PostgreSQL Row-Level Security implementation for the Free Models API.

## Overview

RLS acts as defense-in-depth for user-scoped tables. If a bug bypasses app-layer checks, the database itself enforces row ownership.

## Database Role Reference

| Role | BYPASSRLS | Purpose | Grants |
|------|-----------|---------|--------|
| `fma_app` | No | Runtime queries | CRUD on user-scoped tables, RLS enforced |
| `fma_admin` | Yes | Better Auth, cleanup, migrations | ALL on ALL tables |
| `fma_stats` | No | Public aggregates only | EXECUTE on stats functions + SELECT on `free_models` |

**fma_stats function access:** `get_feedback_counts()`, `get_error_timeline()` - return aggregates only, no raw row access

## Environment Variables

```env
# App connection (RLS enforced) - for user-scoped queries
DATABASE_URL=postgresql://fma_app:...@neon.tech/db

# Admin connection (bypasses RLS) - for Better Auth OAuth, cleanup, migrations
DATABASE_URL_ADMIN=postgresql://fma_admin:...@neon.tech/db

# Stats connection - for public aggregates via SECURITY DEFINER functions
DATABASE_URL_STATS=postgresql://fma_stats:...@neon.tech/db
```

### Generating strong passwords for roles

Use a unique, strong password per role (app, admin, stats). Example:

```bash
python - <<'PY'
import secrets, string
alphabet = string.ascii_letters + string.digits + '!@#$%^&*()_-+='
print(''.join(secrets.choice(alphabet) for _ in range(32)))
PY
```

Repeat for each role and place the values in the corresponding connection strings above.

## Key Column Verification

**VERIFIED**: The `api_keys` table uses column name `key` (not `key_hash`):
- Schema: `src/db/auth-schema.ts` line 67
- Type: `TEXT` (stores SHA-256 hash, base64url encoded)
- Policy: `key = NULLIF(current_setting('app.api_key_hash', true), '')`

## RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| users | owner (id) | admin only | owner | admin only |
| sessions | owner | owner | owner | owner |
| accounts | owner | owner | owner | owner |
| api_keys | (key AND enabled) OR owner | owner | owner | owner |
| api_request_logs | owner | owner | none | none |
| model_feedback | owner | owner | none | none |

## Security Rules for withUserContext

1. **ONLY** call with userId from:
   - `session.user.id` (Better Auth validated)
   - `validation.userId` (from `validateApiKey()`)
2. **NEVER** from request params, body, headers, user input
3. **Verified locations**:
   - `history.ts` - session.user.id
   - `api-auth.ts` - validation.userId from key lookup

## Security Rules for withKeyHashContext

1. Use **ONLY** for single api_keys lookup
2. **Discard** db instance after lookup
3. **Do NOT** reuse for other queries in same context

## api_keys Policy Maintenance

The `api_keys_select` policy requires `enabled = true` for key hash lookups (auth bootstrap).
If you add new flags that should block authentication (e.g., `revoked`, `soft_deleted`),
update the policy to include them:

```sql
-- Example: Adding revoked flag
(key = ... AND enabled = true AND revoked = false)
OR user_id = ...
```

Keep the owner path unrestricted so users can manage disabled/revoked keys in the dashboard.

## Security Rules for fma_stats (DATABASE_URL_STATS)

**SECURITY DEFINER functions** - aggregates only, no raw row access:
- `get_feedback_counts()` - returns COUNT grouped by model/issue/success
- `get_error_timeline()` - returns COUNT grouped by time bucket/model
- No direct table access - cannot query model_feedback
- No raw rows - functions only return aggregates

**Adding new stats queries:**
1. Create a new SECURITY DEFINER function that returns aggregates
2. `ALTER FUNCTION ... OWNER TO fma_admin` (required for BYPASSRLS)
3. `REVOKE ALL FROM PUBLIC, GRANT EXECUTE TO fma_stats`
4. Add TypeScript wrapper in `src/db/stats.ts`

## Migration Role

**Current migration role**: Check which role runs `bun run db:push`
- If `fma_admin`: Default privileges work as-is
- If different role (e.g., `neondb_owner`): Add `ALTER DEFAULT PRIVILEGES FOR ROLE <role>` statements

To check: `SELECT current_user;` during migration or check Neon dashboard.

## Troubleshooting

**Empty results when expected data exists:**
- Check if `app.user_id` is set: `SELECT current_setting('app.user_id', true);`
- Verify using correct role: `SELECT current_user;`
- Check RLS is enabled: `SELECT relrowsecurity FROM pg_class WHERE relname = 'tablename';`

**Auth bootstrap fails:**
- Verify `app.api_key_hash` is set before api_keys lookup
- Confirm column name is `key` (not `key_hash`)
- Check key hash format matches (SHA-256, base64url, no padding)

**New tables not getting grants:**
- Verify which role created the table
- Run `ALTER DEFAULT PRIVILEGES FOR ROLE <creating_role>` if different from fma_admin

## Deployment Strategy

1. **Phase 1**: Deploy `withUserContext` helper (code only, no RLS yet)
2. **Phase 2**: Refactor endpoints to use `withUserContext` wrapper (still using current DB role)
3. **Phase 3**: Run role/policy SQL via Neon console (requires admin privileges)
4. **Phase 4**: Switch `DATABASE_URL` to `fma_app` role, add `DATABASE_URL_ADMIN`
5. **Phase 5**: Monitor for 24 hours - add temporary logging to catch missing user context

**Rollback plan:** If issues arise, switch `DATABASE_URL` back to original role (policies remain but aren't enforced for BYPASSRLS roles).
