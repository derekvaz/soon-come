# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Soon Come** is a real-time Toronto transit (TTC) arrival web app. Users search by route and optional location to see if a vehicle is arriving soon. Built with Next.js 16 App Router, React 19, TypeScript 5, and Tailwind CSS v4.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router, not Pages Router)
- **UI**: React 19, Tailwind CSS v4
- **Language**: TypeScript 5 (strict mode)
- **Linting**: ESLint 9 with `eslint-config-next`
- **Testing**: None configured
- **Deployment**: Netlify (soon-come.netlify.app)
- **Project Management**: Linear (via MCP)
- **MCP Servers**: Linear (`linear-server`), Netlify (`netlify`)

## Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── routes/route.ts        # GET /api/routes — TTC route list
│   │   ├── stops/route.ts         # GET /api/stops — stops/directions for a route
│   │   └── predictions/route.ts   # GET /api/predictions — arrival times
│   ├── results/page.tsx           # Results page (shows predictions inline, no ArrivalCard)
│   ├── layout.tsx                 # Root layout (metadata, fonts, container)
│   ├── page.tsx                   # Home/search page (text search with autocomplete)
│   └── globals.css                # Tailwind v4 theme (custom colors, fonts)
└── components/
    └── Footer.tsx                 # Footer with GTFS badge (currently unused)
```

## Commands

- `npm run dev` — Start dev server (localhost:3000)
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

## API Integration

All data comes from the **Umoiq/NextBus public API** (no auth required):

- Base URL: `https://retro.umoiq.com/service/publicJSONFeed`
- `?command=routeList&a=ttc` — all TTC routes
- `?command=routeConfig&a=ttc&r={tag}` — stops/directions for a route
- `?command=predictions&a=ttc&r={tag}&s={stopTag}` — arrival predictions

### API Routes

| Endpoint | Params | Description |
|----------|--------|-------------|
| `GET /api/routes` | — | TTC route list (memory-cached) |
| `GET /api/stops` | `route`, `direction?` | Directions and stops for a route; when `direction` is omitted returns only directions |
| `GET /api/predictions` | `route`, `stop?`, `location?` | Predictions for a specific stop tag (fast path) or location-name search (fetches up to 10 matching stops in parallel) |

### Departure Types

Each departure has a `type` field:
- `live` — vehicle assigned, not held at layover
- `delayed` — vehicle assigned but `affectedByLayover === "true"`
- `estimate` — no vehicle assigned yet

**"Soon Come" threshold**: A vehicle is marked as arriving soon if the next departure is **< 10 minutes**.

### Favourites

Saved stops are persisted in `localStorage` under the key `soon-come-favourites` as `{ routeTag, stopTag, display }[]`. The home page shows saved stops when the search input is empty.

## Code Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **Components**: PascalCase filenames and exports
- **Types/Interfaces**: PascalCase, defined near usage (no separate types files)
- **State management**: React hooks only (`useState`, `useEffect`, `useRef`) — no external state library
- **Styling**: Tailwind utility classes inline, custom theme colors in `globals.css`
- **Client components**: Marked with `"use client"` directive when using hooks/interactivity
- **API routes**: Use Next.js route handlers (`GET` exported functions) with `NextRequest`/`NextResponse`
- **Error handling**: try-catch in API routes returning appropriate status codes (400, 404, 500, 502)

## Theme Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-green` | `#00843d` | "Yes" / soon arrivals |
| `--color-red` | `#ef3340` | "No" / distant arrivals |
| `--color-muted` | `#6a7282` | Secondary text |
| `--color-live-green` | `#00c950` | Live indicator dot |

## Design Notes

- Mobile-first: max-width 430px container
- Bold typography: Inter font, weights 700 and 900
- High contrast black/white with green/red accents
- Results page background transitions to `#da251d` (TTC red) when `soonCome` is true
- Search page uses `#da251d` as a static background; results card is black
- Inline SVG icons (no icon library) — BookmarkIcon, ShareIcon, SearchIcon defined within page files
- `slideUpFade` CSS animation (defined in `globals.css`) used for staggered entrance of result elements

## Dev Workflow

Tasks are managed in **Linear** and deployed via **Netlify**. MCP servers for both are configured in `.mcp.json`.

### Task Lifecycle

1. **Pick a task** — Query Linear for the oldest, highest-priority issue with status "Todo"
2. **Write a PRD** — Update the Linear issue description with a Product Requirements Document
3. **Mark In Progress** — Set the Linear issue status to "In Progress"
4. **Branch** — Create a feature branch from `main` (e.g. `feat/SOO-123-short-description`)
5. **Develop** — Implement the solution against the PRD
6. **Commit & Push** — Commit changes and push the branch
7. **Create PR** — Open a GitHub pull request linking the Linear issue
8. **Mark In Review** — Update the Linear issue status to "In Review"
9. **Preview** — Provide the Netlify deploy preview URL for review
10. **Merge & Close** — Once approved, merge the PR and mark the Linear issue as "Done"

### Deployment

- **Production URL**: https://soon-come.netlify.app
- Deploys automatically on push to `main` via Netlify
- PR branches get deploy preview URLs from Netlify
- Use the Netlify MCP to check deploy status and get preview URLs

### Linear

- Use the Linear MCP to query, create, and update issues
- Always reference the Linear issue ID (e.g. `SOO-5`) in commit messages and PR descriptions

## Environment Variables

None required. The Umoiq API is public and unauthenticated.
