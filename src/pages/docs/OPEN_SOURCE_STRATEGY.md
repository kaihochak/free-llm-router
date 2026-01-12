# Free LLM Router – Open Source & Monetization Plan

## Why Open Source
- Aligns with mission of enabling $0 building and builds trust via transparency.
- Code is easy to self-host; moat should be data + hosted convenience, not secrecy.
- More adopters → more feedback data → better health metrics → stronger network effects.

## Licensing & Data Terms
- Code: MIT (or similar permissive) for maximum adoption.
- Data/API: Terms of Service clarifying rate limits, acceptable use, and that hosted health data and alerts are a service (can be paid/usage-limited even if code is open).

## What to Monetize (Hosted Value)
- Health data service: fresher metrics, longer history, anomaly alerts, webhooks, CSV/Parquet exports.
- Smart routing: automatic fallbacks/retries, health scoring, load-balancing, budget guards; optional paid “plus” model access.
- Ops features: per-team RBAC, SSO, audit logs, IP allowlists, custom rate limits, usage analytics, billing webhooks.
- Integrations: SDKs, LangChain/LlamaIndex plugins, Postman collection, Grafana/Datadog dashboards.
- Enterprise: dedicated Neon instance, private data tenancy, SLOs, support SLAs, on-call.

## Pricing Shape (example)
- Free: 2–3 keys, 200–500 req/day, 24h metrics window, community support.
- Starter ($9–19/mo): higher limits, 7d–30d history, alerts/webhooks, basic routing/fallback, email support.
- Pro/Team (base $49–99 + usage): SSO, RBAC, audit logs, custom rate limits, weekly reports, priority support.
- Enterprise: bespoke SLOs, dedicated DB, compliance, data export guarantees.

## Why Not Keep It Closed
- Secrecy won’t create lock-in; slows adoption and trust.
- Hosted differentiators above are needed either way; open source accelerates the data flywheel.

## Risks & Mitigations
- Forkability → mitigate with hosted convenience (alerts, routing, SLAs), strong docs/brand, active data network.
- Data quality → require success + failure reporting; rate-limit abuse; show provenance/confidence.
- Monetization lag → clear upgrade path, generous free tier, invest in integrations to make hosted default.

## Recommended Next Steps
1) Publish this strategy; set license to MIT; add ToS for data/API.
2) Ship hosted differentiators: alerts/webhooks, routing/fallback, health scoring.
3) Release client SDKs and integrations; default to hosted endpoint with easy self-host opt-out.
4) Launch pricing tiers and usage limits; add billing webhooks and dashboard indicators.
