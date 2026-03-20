# SKYBUDDY — 3D Flight Tracker

Real-time 3D flight tracking on an interactive globe. Track specific airlines, view aircraft as type-matched 3D models, and monitor live ADS-B data worldwide.

**Live:** [skybuddy.clawnux.com](https://skybuddy.clawnux.com)

## Features

- **3D Globe** — Cesium.js with terrain, atmosphere, and day/night lighting
- **3D Aircraft Models** — Type-matched GLB models (747, 777, wide-body, narrow-body) with Kalitta Air livery
- **Airline Watchlist** — Filter to specific airlines by callsign prefix (e.g. `CKS` for Kalitta Air, `FDX` for FedEx)
- **Aircraft Type Detection** — Identifies B744, B77W, etc. from ADSB.lol data and loads the correct 3D model
- **Dual Data Sources** — ADSB.lol (primary) + OpenSky Network (fallback), automatic failover
- **Click-to-Select** — Detail panel with altitude, speed, heading, vertical rate, aircraft type, ICAO hex, coordinates
- **Camera Tracking** — Lock camera to follow a selected aircraft
- **Flight Trails** — Accumulated path history
- **Flight Prediction** — 60-second heading vector projection
- **Airport Overlay** — 40+ major international airports with ICAO labels
- **Altitude Filter** — Dual-range slider to filter by altitude band
- **Search** — Filter by callsign, ICAO hex, or country
- **Keyboard Shortcuts** — `L` labels · `T` trails · `P` predict · `A` airports · `F` alt filter · `W` watchlist · `H` home · `R` refresh

## Setup

1. Get a free Cesium Ion token at [ion.cesium.com/tokens](https://ion.cesium.com/tokens)
2. Open `index.html` in a browser (or serve via any static file server)
3. Enter your Cesium token and optionally OpenSky credentials
4. The watchlist defaults to Kalitta Air (`CKS`) — add more prefixes as needed

### Optional: Environment Config

Create `env.js` to auto-fill your Cesium token:

```js
window.ENV = {
  CESIUM_ION_TOKEN: 'your-token-here'
};
```

## Project Structure

```
skybuddy/
├── index.html          # Main entry point
├── css/style.css       # All styles (HUD, panels, controls, responsive)
├── js/app.js           # Application logic (data fetch, globe, UI)
├── assets/
│   ├── b747.glb        # Boeing 747-400F model (Kalitta livery)
│   ├── b777.glb        # Boeing 777F model
│   ├── wide.glb        # Generic wide-body (A330/787/767)
│   ├── narrow.glb      # Generic narrow-body (737/A320)
│   ├── favicon.svg     # Browser favicon
│   └── icon-180.png    # PWA icon
├── manifest.json       # PWA manifest
├── env.js              # Environment config (not committed)
└── README.md
```

## Tech Stack

- **Cesium.js 1.114** — 3D globe rendering, terrain, camera, entity system
- **ADSB.lol API** — Live ADS-B data with aircraft type identification
- **OpenSky Network API** — Fallback ADS-B data source
- **Vanilla JS** — No framework, no build step, no npm

## Data Sources

| Source | Rate Limit | Aircraft Type | Auth |
|--------|-----------|---------------|------|
| ADSB.lol | Generous | Yes (`t` field) | None |
| OpenSky | ~100/day anon, ~4000/day auth | No | Optional |

## Deployment

Static files — serve with any web server. Currently deployed via Caddy on a Hostinger VPS with auto-TLS.

## License

MIT
