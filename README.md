# SKYBUDDY — 3D Flight Tracker

Real-time 3D flight tracking on an interactive globe. Track specific airlines, view aircraft as type-matched 3D models, and monitor live ADS-B data worldwide.

**Live:** [skybuddy.clawnux.com](https://skybuddy.clawnux.com)

## Features

### Core
- **3D Globe** — Cesium.js with terrain, atmosphere, and day/night lighting
- **3D Aircraft Models** — Type-matched GLB models (B744, B748, B742, B772, B773, B738, A320, A333) with custom Kalitta Air livery on 747s
- **Live ADS-B Data** — ADSB.lol primary source with global coverage; OpenSky fallback
- **Click-to-Select** — Detail panel with altitude, speed, heading, vertical rate, type, registration, owner, destination, ETA, distance

### Tracking & Navigation
- **Airline Watchlist** — Filter by callsign prefix (default: `CKS` / Kalitta Air), always active
- **Flight Routes** — Real flight plan data from VRS Standing Data API with great-circle arc visualization
- **Camera Tracking** — Lock camera to follow selected aircraft
- **Orbit Mode** — Cinematic orbit around tracked aircraft
- **Zoom to Aircraft** — Click any aircraft in the list or schedule to zoom in
- **Flight Trails** — Accumulated path history
- **Flight Prediction** — 60-second heading vector projection

### Schedule System
- **Screenshot Import** — Upload crew schedule photos, Claude Vision AI extracts flight legs automatically
- **ETA Countdown** — Live countdown to landing for scheduled flights
- **Cross-Device Sync** — Server-side JSON storage syncs schedule between mobile and desktop
- **Click-to-Show Route** — Click a scheduled flight to draw its great-circle route on the globe
- **Remove/Clear** — Delete individual flights or clear all with sync

### Overlays & UI
- **Others Toggle** — Show/hide non-watchlist aircraft and side panel
- **Labels** — Callsign, type, flight level, origin→destination; toggleable on mobile
- **Label Decluttering** — Overlapping labels stagger vertically
- **Conflict Zones** — War zone overlay with country-level severity shading
- **Airport Overlay** — 100+ airports with ICAO labels
- **Altitude Filter** — Dual-range slider to filter by altitude band
- **Minimap** — World overview with aircraft positions and conflict zones
- **Responsive Design** — Desktop: full panels; Mobile: compact fixed layout with CKS filter always active

### Keyboard Shortcuts
`L` labels · `T` trails · `P` predict · `A` airports · `F` alt filter · `W` watchlist · `C` conflicts · `N` north-up · `H` home · `R` refresh

## Setup

1. Get a free Cesium Ion token at [ion.cesium.com/tokens](https://ion.cesium.com/tokens)
2. Create `.env` with your tokens:
   ```
   CESIUM_ION_TOKEN=your-cesium-token
   ANTHROPIC_API_KEY=your-claude-api-key
   OPENSKY_USER=
   OPENSKY_PASS=
   ```
3. Run `./gen-env.sh` to generate `env.js`
4. Serve with any static file server (Caddy, nginx, etc.)
5. Start the schedule API for cross-device sync:
   ```bash
   node api/server.js
   ```

### Schedule API

Lightweight Node.js micro-API that persists the flight schedule to a JSON file, enabling sync between devices.

```bash
# Install as systemd service
cp skybuddy-api.service /etc/systemd/system/
systemctl enable --now skybuddy-api
```

Caddy proxies `/api/schedule` to port 3070. The frontend saves to both localStorage (instant) and server (sync).

## Project Structure

```
skybuddy/
├── index.html          # Main entry point
├── css/
│   └── style.css       # All styles (HUD, panels, responsive)
├── js/
│   └── app.js          # Application logic (data, globe, UI)
├── api/
│   └── server.js       # Schedule sync API (Node.js)
├── data/
│   └── schedule.json   # Persistent schedule storage
├── assets/
│   ├── b744.glb        # Boeing 747-400 (Kalitta Air livery)
│   ├── b748.glb        # Boeing 747-8
│   ├── b742.glb        # Boeing 747-200
│   ├── b772.glb        # Boeing 777-200
│   ├── b773.glb        # Boeing 777-300
│   ├── b738.glb        # Boeing 737-800
│   ├── a320.glb        # Airbus A320 (generic narrow-body)
│   ├── a333.glb        # Airbus A330-300 (generic wide-body)
│   ├── world.json      # Coastline polygons for minimap
│   ├── favicon.svg     # Browser favicon
│   └── icon-180.png    # PWA icon
├── .env                # Environment variables (not committed)
├── gen-env.sh          # Generates env.js from .env
├── manifest.json       # PWA manifest
├── CLAUDE.md           # AI assistant context
└── README.md
```

## Tech Stack

- **Cesium.js 1.114** — 3D globe rendering, terrain, camera, entity system
- **ADSB.lol API** — Live ADS-B data with aircraft type identification
- **OpenSky Network API** — Fallback ADS-B data source
- **VRS Standing Data** — Flight route/plan data (free CDN, no auth)
- **Claude Vision API** — Schedule screenshot parsing (optional)
- **hexdb.io** — Aircraft registration and owner lookup
- **Node.js** — Schedule sync API
- **Caddy** — Static file server + reverse proxy with auto-TLS
- **Vanilla JS** — No framework, no build step, no npm

## Data Sources

| Source | Rate Limit | Aircraft Type | Auth |
|--------|-----------|---------------|------|
| ADSB.lol | Generous | Yes (`t` field) | None |
| OpenSky | ~100/day anon, ~4000/day auth | No | Optional |
| VRS Standing Data | Unlimited (CDN) | N/A | None |
| hexdb.io | Generous | Registration/owner | None |

## License

MIT
