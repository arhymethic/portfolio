# NFC Portfolio — Layer 1

Personal portfolio page linked to an NFC card. Captures visitor details and routes them to WhatsApp.

## Quick Start

```bash
npm install
npm run dev       # starts with --watch (auto-restarts on file changes)
# or
npm start         # production
```

Runs on `http://localhost:3000` (change port in `config.json`).

## Configuration

**Edit `config.json` — this is the only file you should need to touch for content.**

| Key | What it does |
|---|---|
| `name` | Your name — shown in nav, hero, page title |
| `initials` | Single letter for the avatar circle when no photo is set |
| `tagline` | One-liner under your name |
| `photo` | Path relative to `/public`, e.g. `images/me.jpg`. Leave `""` for initials avatar. |
| `whatsapp.number` | Your number — country code + digits, no `+` or spaces |
| `whatsapp.message` | The pre-written message the visitor sends you |
| `projects[]` | Array of `{ title, description, url, tags[] }` |
| `socials` | `{ linkedin, github, twitter, email }` — leave blank to hide |
| `meta.title` | Browser tab title |
| `meta.description` | SEO meta description |
| `server.port` | Port to listen on (default 3000) |

## File Structure

```
/
├── config.json          ← All variables live here
├── server.js            ← Express: serves static files + /api/* routes
├── package.json
├── data/
│   └── contacts.json    ← Captures appended here automatically
└── public/
    ├── index.html
    ├── style.css
    └── main.js
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/config` | GET | Returns non-sensitive config to the frontend |
| `/api/capture` | POST | Saves a contact, returns the WhatsApp URL |
| `/api/contacts` | GET | Lists all captured contacts (internal use) |

## Captured Fields

Every form submission saves:
- `id`, `timestamp`
- `name`, `email`, `company`, `linkedin`, `role`, `whereMet`

## Running as a Service (home server)

```bash
# With PM2
npm install -g pm2
pm2 start server.js --name portfolio
pm2 save
pm2 startup
```

## Next Layers

| Layer | Description |
|---|---|
| 3 | WhatsApp deep-link (already wired via config) |
| 4 | Auto-enrich contacts using Clay / Apollo / n8n |
| 5 | Searchable memory — Notion AI / custom RAG over contacts.json |
