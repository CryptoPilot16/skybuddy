# SKYBUDDY — 3D Flight Tracker

## What This Is
Real-time 3D flight tracker using Cesium.js (3D globe) + OpenSky Network (ADS-B data).
Static site, no build step, no framework.

## Tech Stack
- **Cesium.js 1.114** — 3D globe rendering, terrain, camera control
- **OpenSky Network REST API** — live aircraft state vectors (lat/lon/alt/heading/speed)
- **Vanilla JS** — no React, no bundler, no npm

## Architecture
- `index.html` — main entry, loads CSS + JS from separate files
- `css/style.css` — all styles (HUD, panels, controls, responsive)
- `js/app.js` — application logic (data fetch, globe render, UI interactions)
- `assets/` — favicon and icons
- Cesium ion token required (free at ion.cesium.com/tokens)
- OpenSky auth optional (anonymous = ~100 req/day, auth = ~4000 req/day)
- Auto-refreshes every 10s, scopes to camera viewport
- Aircraft rendered as 3D GLB models matched to aircraft type (747, 777, wide/narrow body)
- `assets/b747.glb` — Boeing 747-400F with Kalitta livery colors
- `assets/b777.glb` — Boeing 777F
- `assets/wide.glb` — Generic wide-body (A330/787/767)
- `assets/narrow.glb` — Generic narrow-body (737/A320)

## Key APIs
- OpenSky: `GET https://opensky-network.org/api/states/all?lamin=&lomin=&lamax=&lomax=`
- Returns: [icao24, callsign, origin_country, time_position, last_contact, lon, lat, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]

## Deployment
- Static files served via Caddy on VPS
- VPS: 72.61.17.152 (Hostinger, Caddy)
- Domain: skybuddy.clawnux.com
- Direct access: http://72.61.17.152:8070

## Current Features
- 3D globe with terrain + atmosphere + day/night
- Live aircraft positions color-coded by altitude
- Click-to-select with detail panel (alt/spd/hdg/vsi/icao/lat/lon)
- Camera tracking mode (follows selected aircraft)
- Flight trail accumulation
- Flight prediction vectors (60s heading projection)
- Airport overlay (40 major intl airports with ICAO labels)
- Altitude filter (dual-slider, min/max range)
- Dual data sources: ADSB.lol (primary, has aircraft type) + OpenSky (fallback)
- Searchable aircraft list (callsign, ICAO, country)
- Viewport-scoped API calls
- Credential persistence in localStorage
- Keyboard shortcuts (L/T/P/A/F/H/R/Esc)
- Responsive design (desktop + mobile)
- Notification toasts
- PWA manifest with 180px icon

## Roadmap / Next Steps
- [x] Flight route prediction using heading + speed vectors
- [x] Airport overlay layer (40 major airports, ICAO labels)
- [x] ADSB.lol as fallback data source (automatic failover)
- [x] Altitude filter slider (dual range, min/max)
- [x] GLTF 3D aircraft models matched to aircraft type (B747, B777, wide-body, narrow-body)
- [x] Airline watchlist with callsign prefix filter (default: CKS/Kalitta Air)
- [x] Aircraft type detection from ADSB.lol `t` field
- [ ] Backend proxy (Node.js) to hide OpenSky credentials
- [ ] WebSocket or SSE push instead of polling
- [ ] Heatmap mode (traffic density)
