## Ager Web

Next.js app (App Router) for the Ager frontend.

## Setup

### 1) Install dependencies

```bash
npm ci
```

### 2) Environment variables

Create `.env.local` (not committed) based on `.env.example`.

Required:

- `NEXT_PUBLIC_API_BASE_URL` - backend API base URL (exposed to the browser)

Recommended:

- `API_BASE_URL` - backend API base URL used by Next route handlers (server-only)
- `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` - public site key for the registration CAPTCHA widget

### 3) Run locally

```bash
npm run dev
```

Open http://localhost:3000

## Deploy (Vercel)

1) Push this repo to GitHub
2) Import the project in Vercel
3) Set the environment variables in Vercel:

- `NEXT_PUBLIC_API_BASE_URL` = your production backend URL
- `API_BASE_URL` = your production backend URL

Build command: `npm run build`
Output: Next.js default

## Observability notes

Server-side route handlers under `src/app/api/**` emit structured JSON logs for proxy boundaries.

- Correlation headers are propagated upstream when available:
	- `x-request-id`
	- `x-correlation-id`
	- `traceparent`
- Route handlers emit completion events with:
	- `event_name`
	- `status_code`
	- `duration_ms`
	- request/correlation identifiers

Sensitive fields are intentionally not logged (authorization, cookies, token payloads).
