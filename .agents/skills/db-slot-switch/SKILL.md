---
name: db-slot-switch
description: Prepare or carry out a free-llm-router database slot switch using the repository runbook. Use when the user invokes $db-slot-switch or asks about a slot cutover.
---

Read `docs/DB_SLOT_SWITCH_CHECKLIST.md` before working on a slot switch. That runbook is the source of truth; do not duplicate its procedure here.

Show the **entire numbered procedure**, not just the next step. For every step, say who performs it, how (the exact command or manual action), what result to expect, and whether it is done, pending, or blocked. Substitute the confirmed source and target slot numbers into the commands. In step 1, show how the production slot was established from GitHub and the last successful three-way check; do not use local `.env` as evidence of production. If current Cloudflare state cannot be checked, say so rather than claiming it matches.

Step 2 is a human gate: ask the user to pause production writes and confirm they are paused; there is no automated write-freeze in this repository. Present steps 3 and 4 as commands for the user to run and ask for their results. Step 5 is GitHub-only: show the `gh` commands to change the production Environment variable and dispatch the production workflow. Step 6 verifies Cloudflare after deployment: show the workflow's three-way check and, if useful, a read-only Wrangler Worker check; do not suggest changing Pages or Worker separately with Wrangler. Explain that Wrangler does not provide the equivalent Pages environment-variable readback here. Include the final smoke checks and write-resume step.

Invoking this skill alone authorizes read-only checks and displaying the procedure, not copying/truncating data, changing GitHub or Cloudflare, or deploying. Do not execute user-run steps without a separate explicit request. During an authorized cutover, stop on failed queries, `ERR` counts, mismatched counts, an unconfirmed write freeze, or a failed deployment. Never switch runtime after a failed copy or verification.
