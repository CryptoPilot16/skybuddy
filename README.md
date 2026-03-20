# SKYBUDDY — 3D Flight Tracker

Real-time 3D flight tracking on an interactive globe with terrain visualization.

**Live:** [skybuddy.clawnux.com](https://skybuddy.clawnux.com)

Powered by [Cesium.js](https://cesium.com) + [OpenSky Network](https://opensky-network.org) + [ADSB.lol](https://adsb.lol)

## Features

- **3D Globe** — Full terrain rendering with day/night lighting, atmosphere, and fog
- **Live Aircraft Data** — Real-time positions with 10s auto-refresh
- **Dual Data Sources** — OpenSky Network (primary) with automatic ADSB.lol fallback on rate limiting
- **Altitude Color Coding** — Green (<5K ft), Blue (5–15K), Orange (15–30K), Red (>30K), Gray (ground)
- **Aircraft Detail Panel** — Click any aircraft for altitude, speed, heading, vertical rate, coordinates, ICAO
- **Camera Tracking** — Lock camera to follow a selected aircraft in real-time
- **Flight Trails** — Accumulated position trails showing flight paths
- **Flight Prediction** — 60-second heading vectors projected from current position and speed
- **Airport Overlay** — 40 major international airports with ICAO labels
- **Altitude Filter** — Dual-slider filter to isolate aircraft within a specific altitude range
- **Searchable List** — Side panel filterable by callsign, ICAO, or country
- **Credential Persistence** — Cesium token and OpenSky credentials saved in localStorage
- **PWA Ready** — Manifest and icons for add-to-homescreen
- **Keyboard Shortcuts** — L, T, P, A, F, H, R, Esc
- **Responsive** — Desktop and mobile layouts

## Prerequisites

1. **Cesium Ion Token** (free) — [Get one here](https://ion.cesium.com/tokens)
2. **OpenSky Account** (optional) — Anonymous access is rate-limited (~100 req/day). [Register here](https://opensky-network.org/index.php/register)

## Project Structure

```
skybuddy/
├── index.html          # Main entry point
├── manifest.json       # PWA manifest
├── css/
│   └── style.css       # All styles (HUD, panels, responsive)
├── js/
│   └── app.js          # Application logic (fetch, render, UI)
└── assets/
    ├── favicon.svg     # SVG favicon
    └── icon-180.png    # PWA icon (180x180)
```

## Running Locally

No build step required — this is a static site:

```bash
python3 -m http.server 8080 --directory /root/skybuddy
# or
npx serve /root/skybuddy
```

## Data Sources

| Source | Rate Limit | Auth | Query Style |
|--------|-----------|------|-------------|
| OpenSky Network | ~100/day anon, ~4000/day auth | Optional | Bounding box |
| ADSB.lol | Generous | None | Radius-based |

The app automatically falls back to ADSB.lol if OpenSky returns 429. Click the source label in the top bar to manually switch.

## Deployment

Static files served by Caddy on VPS. No backend, no build step.

```
skybuddy.clawnux.com {
    root * /root/skybuddy
    file_server
    encode gzip
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `L` | Toggle callsign labels |
| `T` | Toggle flight trails |
| `P` | Toggle prediction vectors |
| `A` | Toggle airport overlay |
| `F` | Toggle altitude filter |
| `H` | Fly to home position |
| `R` | Refresh aircraft data |
| `Esc` | Close detail panel |

## License

MIT
