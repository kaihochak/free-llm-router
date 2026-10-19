---
name: db-slot-switch
description: Prepare or carry out a free-llm-router database slot switch using the repository runbook. Use when the user invokes $db-slot-switch or asks about a slot cutover.
---

Read `docs/DB_SLOT_SWITCH_CHECKLIST.md` before working on a slot switch. That runbook is the source of truth; do not duplicate its procedure here.

Start with read-only checks. Establish the live production slot from GitHub and Cloudflare, not local `.env`, and report the proposed source, target, and next step briefly. Do not infer permission to copy data, truncate a target, pause writes, change deployment variables, or deploy from an exploratory request or from invoking this skill alone. Wait for the user's explicit instruction to execute the cutover or a named phase.

When execution is requested, follow the runbook in order. Use explicit source and target slot arguments for the migration and verification commands. Confirm the exact target before accepting the wizard's target truncate prompt. Stop on failed queries, `ERR` counts, mismatched counts, or an unconfirmed write freeze; never switch runtime after a failed copy or verification. After deployment, report the GitHub, Pages, and Worker slot values and any remaining manual checks.
