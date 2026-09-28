# Den Den Mushi SOS — Grand Line Emergency Command

A full-stack disaster-response coordination prototype for **PS-03: Smart Emergency Request and Response Coordination System**.

The product is intentionally designed as a **pirate / Grand Line rescue command deck**, not as a generic AI/SaaS dashboard.

## What it solves

Emergency requests are received as Den Den Mushi distress signals and ranked by a deterministic **Haki Priority Engine** using severity, waiting time and affected-population pressure. Rescue crews can claim calls, update progress, resolve missions and leave a complete event trail.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Drizzle ORM
- PostgreSQL
- Lucide icons
- Server-side priority engine
- REST API through Next.js Route Handlers
- Polling/live client re-prioritisation for the prototype

## Core flow

`SEND SOS → PRIORITY ENGINE → PRIORITY QUEUE → CLAIM → EN ROUTE → ON SCENE → RESOLVED → CAPTAIN'S LOG`

## Included

- Command Deck
- Priority Rescue Queue
- Dynamic waiting-time scoring
- Haki escalation tiers
- Den Den Mushi SOS form
- Response fleet console
- Grand Line tactical map
- Captain's Log / archive
- Request timeline
- Analytics
- Live event ticker
- Presentation-ready Rescue Drill simulator
- PostgreSQL persistence
- Seed data
- REST endpoints
- Docker PostgreSQL setup
- Custom original SVG visual assets

## Priority model

```text
priority = severity_base
         + waiting_minutes × aging_rate
         + min(15, 2.5 × log2(people_affected))
```

The backend recomputes active scores from timestamps; the frontend mirrors the calculation between server refreshes so a request can visibly climb the queue as it waits.

## Local setup

1. Install Node.js 20+ and Docker.
2. Copy `.env.example` to `.env.local`.
3. Start PostgreSQL:

```bash
docker compose up -d postgres
```

4. Install dependencies:

```bash
npm install
```

5. Start the application:

```bash
npm run dev
```

The first API request bootstraps the schema and demo seed data.

## Production notes

The current event is primarily a frontend prototype, so authentication is intentionally kept out of the critical demo path. For a production deployment, add operator authentication, RBAC, rate limiting, WebSocket infrastructure and a managed PostgreSQL instance before exposing the dispatch API publicly.

## Demo credentials

No credentials are required for the hackathon prototype. The app opens directly into the command deck so judges can reach the working flow immediately.

## Presentation mode

Use **Grand Line Rescue Drill → Launch drill** on the Command Deck. It creates a controlled Punk Hazard toxic-gas scenario and walks it through the real backend workflow: create → claim → en route → on scene → resolve.

## Lightweight One Piece Sea UI

The command deck is intentionally streamlined: a compact sea-command header, one Grand Line rescue map, the live SOS queue, a small fleet panel, and the transponder relay. The map uses a nautical Grand Line sea/island/ship route illustration with Monkey D. Luffy, Ace, and Chopper-themed route markers. The Den Den Mushi is an interactive SOS relay: its ringing state reflects unclaimed calls and its action opens the real SOS submission flow at `/sos`.

## Theme Pack: Grand Line Chart UI

This version uses the supplied visual references as first-class UI assets:
- `public/images/theme/den-den-mushi.png` — Den Den Mushi relay artwork
- `public/images/theme/grand-line-map.jpg` — primary interactive rescue map
- `public/images/theme/ship-at-sea.jpg` — command-deck hero
- `public/images/theme/parchment.jpg` — paper/map surface texture
- `public/images/theme/wood.jpg` — ship/deck navigation texture

The interface intentionally keeps the functional dashboard compact and moves the visual language into the map, ship deck, parchment cards and Den Den Mushi relay rather than using a generic SaaS dashboard aesthetic.
