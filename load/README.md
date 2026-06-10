# Load testing (k6)

Baseline load scenarios for the API template.

## Prerequisites

Install [k6](https://k6.io/docs/get-started/installation/).

## Run locally

Start the API and Postgres first (for example with `docker compose up`).

```bash
pnpm run start:prod
```

Health probe baseline:

```bash
pnpm run test:load
```

Auth flow scenario:

```bash
k6 run load/scenarios/auth-flow.js
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | API base URL |
| `VUS` | `10` | Virtual users |
| `DURATION` | `30s` | Test duration |

Example:

```bash
BASE_URL=http://localhost:3000 VUS=20 DURATION=1m k6 run load/scenarios/health-live.js
```

## Thresholds

- `health-live`: p95 < 200ms, error rate < 1%
- `auth-flow`: p95 < 500ms, error rate < 5%

These run manually or via the scheduled GitHub Actions workflow — not on every PR.
