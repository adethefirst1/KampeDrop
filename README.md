# SureDrop

Trust-first hyperlocal delivery for Badagry–Ojo, Lagos.

## Architecture

| Surface | Path | Role |
|---------|------|------|
| Marketing website | `/`, `/how`, `/guarantee` | Landing & story |
| Installable app (PWA) | `/app/*` | Order · cart · checkout · track |

PWA `start_url` is `/app` — the home-screen icon opens the app, not the landing page.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

For a real install prompt, use HTTPS or `npm run build && npm run preview`.
