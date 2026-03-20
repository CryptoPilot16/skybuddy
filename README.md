# SKYBUDDY — 3D Flight Tracker

Real-time 3D flight tracking on an interactive globe. Track specific airlines, view aircraft as type-matched 3D models, and monitor live ADS-B data worldwide.

**Live:** [skybuddy.clawnux.com](https://skybuddy.clawnux.com)

## Features

- **3D Globe** — Cesium.js with terrain, atmosphere, and day/night lighting
- **3D Aircraft Models** — Type-matched GLB models (B744, B748, B772, B773, B738, A320, A333) with custom Kalitta Air livery on 747s
- **Airline Watchlist** — Filter to specific airlines by callsign prefix (e.g. `CKS` for Kalitta Air, `GTI` for Atlas Air)
- **Aircraft Type Detection** — Identifies aircraft type from ADSB.lol `t` field and loads the correct 3D model
- **Triple Data Sources** — ADSB.lol (primary) + airplanes.live (supplementary) + OpenSky Network (fallback)
- **Flight Routes** — Real flight plan data from VRS Standing Data API with 3D parabolic arc visualization
- **Schedule System** — Personal flight schedule with AI-powered screenshot import (Claude Vision) and ETA countdown
- **Click-to-Select** — Detail panel with altitude, speed, heading, vertical rate, aircraft type, registration, owner
- **Camera Tracking** — Lock camera to follow a selected aircraft with orbit and GPS modes
- **Flight Trails** — Accumulated path history with color-coded altitude
- **Flight Prediction** — 60-second heading vector projection
- **Airport Overlay** — 100+ airports with ICAO labels
- **Conflict Zones** — War zone overlay with depth-tested labels (hidden behind globe)
- **Altitude Filter** — Dual-range slider to filter by altitude band
- **Search** — Filter by callsign, ICAO hex, or country
- **Enhanced Labels** — Callsign, type, flight level, and origin/destination visible from globe altitude
- **Minimap** — Draggable, resizable world overview with aircraft positions
- **Responsive Design** — Desktop and mobile layouts with touch support
- **Keyboard Shortcuts** — `L` labels · `T` trails · `P` predict · `A` airports · `F` alt filter · `W` watchlist · `C` conflicts · `N` north-up · `H` home · `R` refresh

## Screenshots

Default view shows the schedule panel and minimap. Control buttons (Others, Watchlist, Labels, Conflicts, Refresh) are in the top menu bar.

## Setup

1. Get a free Cesium Ion token at [ion.cesium.com/tokens](https://ion.cesium.com/tokens)
2. Create a `.env` file with your tokens (see below)
3. Run `./gen-env.sh` to generate `env.js`
4. Serve with any static file server (or open `index.html` directly)

### Environment Config

Create `.env` in the project root:

```
CESIUM_ION_TOKEN=your-cesium-token
ANTHROPIC_API_KEY=your-claude-api-key
OPENSKY_USER=
OPENSKY_PASS=
```

Then run:
```bash
./gen-env.sh
```

The Anthropic API key enables the schedule screenshot import feature (Claude Vision parses crew schedule photos into flight legs).

## Project Structure

```
skybuddy/
├── index.html          # Main entry point
├── css/
│   └── style.css       # All styles (HUD, panels, responsive)
├── js/
│   └── app.js          # Application logic (data, globe, UI)
├── assets/
│   ├── b744.glb        # Boeing 747-400 (Kalitta Air livery)
│   ├── b748.glb        # Boeing 747-8
│   ├── b742.glb        # Boeing 747-200
│   ├── b772.glb        # Boeing 777-200
│   ├── b773.glb        # Boeing 777-300
│   ├── b77k.glb        # Boeing 777 (Kalitta Air livery)
│   ├── b738.glb        # Boeing 737-800
│   ├── a320.glb        # Airbus A320 (generic narrow-body)
│   ├── a333.glb        # Airbus A330-300 (generic wide-body)
│   ├── world.json      # Simplified coastline polygons for minimap
│   ├── favicon.svg     # Browser favicon
│   └── icon-180.png    # PWA icon
├── .env                # Environment variables (not committed)
├── .gitignore          # Git ignore rules
├── gen-env.sh          # Generates env.js from .env
├── manifest.json       # PWA manifest
├── CLAUDE.md           # AI assistant context
└── README.md
```

## Tech Stack

- **Cesium.js 1.114** — 3D globe rendering, terrain, camera, entity system
- **ADSB.lol API** — Live ADS-B data with aircraft type identification
- **airplanes.live API** — Supplementary ADS-B data for wider coverage
- **OpenSky Network API** — Fallback ADS-B data source
- **VRS Standing Data** — Flight route/plan data (free, no auth)
- **Claude Vision API** — Schedule screenshot parsing (optional)
- **Vanilla JS** — No framework, no build step, no npm

## Data Sources

| Source | Rate Limit | Aircraft Type | Auth |
|--------|-----------|---------------|------|
| ADSB.lol | Generous | Yes (`t` field) | None |
| airplanes.live | Generous | Yes | None |
| OpenSky | ~100/day anon, ~4000/day auth | No | Optional |
| VRS Standing Data | Unlimited (CDN) | N/A | None |

## Deployment

Static files — serve with any web server. Currently deployed via Caddy on a Hostinger VPS with auto-TLS.

## License

MIT
