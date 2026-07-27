# portfolio

NFC business card backend. Tap the card → browser opens → visitor fills in their details → you get a WhatsApp ping. Contacts are stored locally, automatically scraped for LinkedIn/Instagram data, and indexed for semantic search.

## What it does

- Serves a terminal-aesthetic portfolio page
- Collects visitor details via a form (name, email, Instagram, LinkedIn, role, where you met)
- Fires a WhatsApp deep-link so the visitor messages you immediately
- Scrapes their LinkedIn/Instagram in the background using Playwright
- Embeds all contacts into a local vector store for semantic search
- Admin dashboard at `/admin` to browse, search, and annotate contacts

## Running with Docker (recommended)

Make sure Docker and Docker Compose are installed, then:

```bash
cp .env.example .env
# edit .env — set ADMIN_USERNAME and ADMIN_PASSWORD
docker compose up -d
```

That's it. The first build takes a few minutes (installs Chromium, downloads the embedding model). Subsequent starts are instant.

- Portfolio: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

**Useful commands:**

```bash
docker compose logs -f          # live logs
docker compose restart          # restart after config.json changes
docker compose down             # stop
docker compose up -d --build    # rebuild after code changes
```

**Data** (contacts, vectors, avatars, model cache) lives in `./data/` on the host — it persists across restarts and rebuilds automatically.

**Config** — edit `config.json` on the host and run `docker compose restart`. No rebuild needed.

## Running without Docker

```bash
cp .env.example .env
npm install
npx playwright install chromium  # only needed for scraping
npm start
```

## Configuration

Everything visible on the site lives in `config.json` — name, tagline, colours, WhatsApp number, boot screen text, all of it. Edit it and restart.

Key fields:

| Field | Description |
|---|---|
| `name` | Your name |
| `tagline` | One-liner under your name |
| `whatsapp.number` | Country code + number, no spaces (e.g. `917000000000`) |
| `whatsapp.message` | Pre-filled message the visitor sends you |
| `socials` | LinkedIn, GitHub, Twitter, email — leave blank to hide |
| `theme.colors` | All CSS variables — change the colour scheme here |
| `photo` | Path relative to `/public`, e.g. `images/me.jpg` |

Projects are in `data/projects.json`:

```json
[
  {
    "title": "Project Name",
    "description": "What it does.",
    "url": "https://github.com/you/project",
    "tags": ["tag1", "tag2"]
  }
]
```

## Environment variables

```
ADMIN_USERNAME=   # login for /admin
ADMIN_PASSWORD=   # use something strong
PORT=3000         # optional, default 3000
NODE_ENV=production
```

## Admin dashboard

Go to `/admin` and log in with the credentials from your `.env`.

- **Contacts table** — all captured visitors, sortable and filterable
- **Semantic search** — find contacts by describing them in plain English (runs a local embedding model)
- **Contact detail panel** — full enriched profile, notes field, delete button
- **Enrich All** — triggers background scraping for all contacts that have social handles

## Scripts

```bash
npm run reindex      # rebuild vector index from contacts.json
npm run scrape-all   # re-scrape all contacts with social handles
```

Inside Docker:

```bash
docker compose exec app node scripts/reindex.js
docker compose exec app node scripts/scrape-all.js
```

## Project structure

```
├── server.js
├── config.json
├── .env
├── data/
│   ├── contacts.json       # captured contacts (gitignored)
│   ├── projects.json       # your projects
│   ├── vectors/            # vector index (gitignored)
│   ├── avatars/            # downloaded profile pictures (gitignored)
│   └── models/             # embedding model cache (gitignored)
├── lib/
│   ├── contacts.js         # read/write contacts.json
│   ├── embeddings.js       # local ML model (all-MiniLM-L6-v2)
│   ├── scraper.js          # Playwright scraper for LinkedIn + Instagram
│   └── vectorStore.js      # vectra wrapper
├── middleware/
│   ├── auth.js             # HTTP Basic Auth
│   ├── rateLimits.js
│   └── validateCapture.js
├── routes/
│   ├── api.js              # /api/config, /api/capture
│   └── admin.js            # /admin/* (auth-protected)
├── scripts/
│   ├── reindex.js
│   └── scrape-all.js
└── public/
    ├── index.html
    ├── main.js
    ├── style.css
    └── admin/
        ├── index.html
        └── admin.js
```
