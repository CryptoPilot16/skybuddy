# SKYBUDDY — 3D Flight Tracker

## What This Is
Real-time 3D flight tracker using Cesium.js (3D globe) + ADS-B data.
Static site with lightweight Node.js schedule API, no framework, no build step.

## Tech Stack
- **Cesium.js 1.114** — 3D globe rendering, terrain, camera control
- **ADSB.lol API** — primary ADS-B data source (aircraft type in `t` field)
- **OpenSky Network REST API** — fallback ADS-B source
- **VRS Standing Data** — flight route data (free CDN)
- **Claude Vision API** — schedule screenshot parsing
- **hexdb.io** — aircraft registration/owner lookup
- **Vanilla JS** — no React, no bundler, no npm

## Architecture
- `index.html` — main entry, loads CSS + JS from separate files
- `css/style.css` — all styles (HUD, panels, controls, responsive)
- `js/app.js` — application logic (data fetch, globe render, UI interactions)
- `api/server.js` — schedule sync API (Node.js, port 3070)
- `data/schedule.json` — persistent schedule storage
- `assets/` — 3D models, favicon, icons, minimap data
- Cesium ion token required (free at ion.cesium.com/tokens)
- Auto-refreshes every 10s, scopes to camera viewport
- CKS watchlist filter always active (Kalitta Air fleet tracking)

### 3D Models
- `assets/b744.glb` — Boeing 747-400 with Kalitta Air livery
- `assets/b748.glb` — Boeing 747-8 (FR24 model)
- `assets/b742.glb` — Boeing 747-200 (FR24 model)
- `assets/b772.glb` — Boeing 777-200 (FR24 model)
- `assets/b773.glb` — Boeing 777-300 (FR24 model)
- `assets/a333.glb` — Airbus A330-300 — generic wide-body
- `assets/a320.glb` — Airbus A320 — generic narrow-body
- `assets/b738.glb` — Boeing 737-800 (FR24 model)
- `assets/world.json` — Simplified world coastline polygons for minimap

### Model Heading
- FR24 models have nose along +X axis (90° Y rotation baked in)
- Default heading offset: -90° to align with Cesium's -Z forward convention
- Heading offsets configurable per model via `MODEL_HEADING_OFFSETS` map

## Key APIs
- ADSB.lol: `GET https://api.adsb.lol/v2/ladd` (global, includes type)
- OpenSky: `GET https://opensky-network.org/api/states/all?lamin=&lomin=&lamax=&lomax=`
- VRS Standing Data: `GET https://vrs-standing-data.adsb.lol/routes/{PREFIX}/{CALLSIGN}.json`
- hexdb.io: `GET https://hexdb.io/hex-type?hex={ICAO}` and `GET https://hexdb.io/api/v1/aircraft/{ICAO}`
- Schedule API: `GET/POST http://localhost:3070/api/schedule`

## Deployment
- Static files served via Caddy on VPS
- VPS: 72.61.17.152 (Hostinger, Caddy)
- Domain: skybuddy.clawnux.com
- Direct access: http://72.61.17.152:8070
- Schedule API: systemd service `skybuddy-api`, Caddy proxies `/api/schedule` → port 3070
- GitHub: https://github.com/CryptoPilot16/skybuddy

## Default UI State
- **OTHERS**: ON (side panel + all aircraft visible)
- **WATCHLIST**: ON (CKS filter always active)
- **LABELS**: ON (aircraft labels shown)
- **CONFLICTS**: ON (conflict zones drawn)
- **Schedule panel**: visible (top-right on desktop, bottom on mobile)
- **Minimap**: visible (bottom-left)
- **Mobile**: CKS watchlist always active, compact fixed layout, side panel hidden by default

## Current Features
- 3D globe with terrain + atmosphere + day/night
- Live aircraft positions with 3D type-matched models
- CKS/Kalitta Air watchlist filter (always active, persistent)
- Click-to-select with detail panel (alt/spd/hdg/vsi/type/reg/owner/dest/ETA/distance)
- Camera tracking mode + orbit mode
- Zoom to aircraft from list or schedule
- Flight trail accumulation
- Flight prediction vectors (60s heading projection)
- Airport overlay (100+ airports with ICAO labels)
- Flight routes with great-circle arcs from VRS data
- Schedule system with AI screenshot import (Claude Vision)
- Cross-device schedule sync via server API
- Click schedule flight to show route on globe
- Conflict zones overlay with severity shading
- Label decluttering (stagger overlapping labels)
- Minimap with aircraft positions and conflict zones
- Responsive design (desktop full panels, mobile compact fixed layout)
- Keyboard shortcuts (L/T/P/A/F/W/C/N/H/R)
- hexdb.io aircraft registration and owner lookup

## Roadmap
- [ ] WebSocket or SSE push instead of polling
- [ ] Heatmap mode (traffic density)
- [ ] Kalitta Air livery on 777 models
- [ ] Backend proxy to hide API credentials
