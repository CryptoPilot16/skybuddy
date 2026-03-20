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
- `assets/b744.glb` — Boeing 747-400 with Kalitta Air livery (red/gold stripes, white fuselage)
- `assets/b748.glb` — Boeing 747-8 (FR24 model, 1.7MB)
- `assets/b772.glb` — Boeing 777-200 (FR24 model, 1.9MB)
- `assets/b773.glb` — Boeing 777-300 (FR24 model, 1.3MB)
- `assets/a333.glb` — Airbus A330-300 (FR24 model, 1.7MB) — used for generic wide-body
- `assets/a320.glb` — Airbus A320 (FR24 model, 1.2MB) — used for generic narrow-body
- `assets/b738.glb` — Boeing 737-800 (FR24 model, 2.9MB)
- `assets/world.json` — Simplified world coastline polygons for minimap (Natural Earth 110m)

## Key APIs
- OpenSky: `GET https://opensky-network.org/api/states/all?lamin=&lomin=&lamax=&lomax=`
- Returns: [icao24, callsign, origin_country, time_position, last_contact, lon, lat, baro_altitude, on_ground, velocity, true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
- VRS Standing Data (flight routes): `GET https://vrs-standing-data.adsb.lol/routes/{PREFIX}/{CALLSIGN}.json`
- Returns: `{ callsign, airline_code, airport_codes, _airports: [{ name, icao, iata, lat, lon }] }`
- Free, no auth, hosted on GitHub Pages CDN

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
- Airport overlay (100+ airports with ICAO labels, name on hover/click)
- Dual data sources: ADSB.lol (primary, has aircraft type) + OpenSky (fallback)
- Searchable aircraft list (callsign, ICAO, country)
- Viewport-scoped API calls
- Credential persistence in localStorage (auto-launch, settings in panel)
- Keyboard shortcuts (L/T/A/C/R/Shift+R/H/Esc)
- Responsive design (desktop + mobile)
- Notification toasts
- PWA manifest with 180px icon
- Route toggle (selected/all/off) with real VRS flight plan data
- Schedule system with ETA countdown, departure times, multi-leg routes
- Enhanced world-view labels: callsign, type, FL, origin→destination
- 3D route arcs with altitude profile and ground shadow
- Green/gold highlight for scheduled/onboard aircraft

## Roadmap / Next Steps
- [x] Flight route prediction using heading + speed vectors
- [x] Airport overlay layer (40 major airports, ICAO labels)
- [x] ADSB.lol as fallback data source (automatic failover)
- [x] Altitude filter slider (dual range, min/max)
- [x] GLTF 3D aircraft models matched to aircraft type (B747, B777, wide-body, narrow-body)
- [x] Airline watchlist with callsign prefix filter (default: CKS/Kalitta Air)
- [x] Aircraft type detection from ADSB.lol `t` field
- [x] Kalitta Air livery on B744 model (red/gold fuselage stripes, diagonal tail stripes)
- [x] 3D flight route projection with real flight plan data from VRS API
- [x] Route toggle (selected/all/off) with origin/destination airport markers
- [x] Enhanced labels: callsign, type, FL, origin→destination above aircraft
- [x] Side-view zoom camera (profile view of aircraft)
- [x] Airport webcam PiP on approach/departure (worldcams.tv integration)
- [x] Schedule system with ETA countdown and multi-leg support (default: JFK→PANC→RJAA)
- [x] Enhanced world-view labels visible from globe altitude
- [x] Conflict zones overlay with war zone avoidance filter
- [ ] Backend proxy (Node.js) to hide OpenSky credentials
- [ ] WebSocket or SSE push instead of polling
- [ ] Heatmap mode (traffic density)
