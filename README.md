# ⚾ MLB 162-0

> MLB stats, standings & addictive baseball mini-games. Build an all-time roster and chase a perfect 162-0 season.
> Live at **[mlb162-0.com](https://mlb162-0.com)**.

The baseball entry in the **0 Series**, alongside [AFL 23-0](https://afl23-0.com), [NRL 24-0](https://nrl24-0.com) and [Football Invincibles](https://footballinvincibles.com).

## What's inside

**Stats & data (SEO-optimised, static-rendered)**
- Live **standings** by division for every season, straight from the MLB Stats API
- **Stat leaders** — home runs, RBIs, hits, stolen bases, OPS, wins, strikeouts, saves, ERA
- **Player profiles** with career stats + a static page per player
- **Schedule & scores** — the live slate and recent finals
- The signature **162-0 chase** — who's still unbeaten this season (and who's chasing 0-162)

**Perfect Season**
Spin a franchise and era, draft a legend into every spot in the lineup and rotation, and chase a flawless 162-0. Six modes — Starting Nine, The Roster, Active 18, Salary Cap, The Gauntlet and Cellar Dwellers — with a Monte-Carlo season simulator. The sim is tuned so only a near-perfect roster has a **~5% shot at 162-0** — the same vanishing margin as a real perfect season.

**The Games Vault**
| Game | What it is |
|------|-----------|
| 🏆 **Invincibles** | Draft a roster, simulate a season, chase an undefeated record |
| 🟩 **Diamond** | The baseball Wordle — daily mystery player in 8 guesses |
| 📈 **Higher or Lower** | More or fewer HR/strikeouts/wins? Build a streak |
| 🕵️ **Guess the Player** | Clues revealed one at a time; fewer = more points |
| 🧭 **Career Path** | Name the player from their profile |
| ⏱️ **Beat the Clock** | Name the top home-run hitters in 60 seconds |
| 🔮 **Score Predictor** | Call the final score on real MLB games |

Ratings are built from real MLB Stats API season data. The full method is on the [About page](https://mlb162-0.com/about).

## Tech

- **Next.js (App Router) + TypeScript + React 19**, exported as a **static site** for GitHub Pages
- **Tailwind v4** + a small CSS design system
- **SEO**: per-page metadata, Open Graph/Twitter, `sitemap.ts` (800+ player URLs), `robots.ts`, `manifest.ts`, JSON-LD (WebSite, WebApplication, Person, VideoGame, BreadcrumbList)
- A **pipeline** snapshots the public MLB Stats API into JSON the pages read at build time; a global leaderboard runs on an optional Cloudflare Worker

## Project layout

```
pipeline/        # data pipeline (MLB Stats API → datasets, ratings)
web/app/         # routes (pages, games, sitemap/robots/manifest)
web/components/  # UI + games/ (client game components)
web/lib/         # game engine, simulator, SEO helpers
web/public/data/ # generated JSON (pool, games, standings, schedule)
worker/          # Cloudflare Worker + KV leaderboard (optional)
```

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to web/out
npm run data     # regenerate the dataset from the MLB Stats API
```

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the static export and publishes it to GitHub Pages. One-time setup: **Settings → Pages → Source: GitHub Actions**, add the custom domain `mlb162-0.com`, and point Cloudflare DNS at GitHub Pages. A daily `refresh.yml` workflow re-runs the pipeline and commits updated standings/schedule data.

---

Independent project. Not affiliated with or endorsed by Major League Baseball, the MLBPA, or any club. Data is for informational and entertainment use.
