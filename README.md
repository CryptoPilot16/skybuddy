# SKYBUDDY // 3D Flight Tracker

Real-time 3D flight tracking on an interactive globe with terrain visualization.

Powered by [Cesium.js](https://cesium.com) + [OpenSky Network](https://opensky-network.org).

## Features

- **3D Globe** — Full terrain rendering with day/night lighting via CesiumJS
- **Live Aircraft Data** — Real-time positions from OpenSky Network API (10s refresh)
- **Aircraft Details** — Click any aircraft for altitude, speed, heading, vertical rate, coordinates
- **Camera Tracking** — Lock camera to follow a selected aircraft across the globe
- **Flight Trails** — Toggle polyline trails showing recent aircraft paths
- **Callsign Labels** — Toggle on/off, auto-scaled by zoom level
- **Search & Filter** — Filter aircraft list by callsign, ICAO code, or country
- **Altitude Color Coding** — Visual legend: green (<5K ft), blue (5-15K), amber (15-30K), orange (>30K)
- **Credential Persistence** — Cesium token and OpenSky credentials saved in localStorage
- **Keyboard Shortcuts** — `L` labels, `T` trails, `H` home, `R` refresh, `Esc` close
- **Responsive Design** — Works on desktop and mobile
- **PWA Ready** — Web app manifest for installable experience

## Prerequisites

1. **Cesium Ion Token** (free) — [Get one here](https://ion.cesium.com/tokens)
2. **OpenSky Account** (optional) — Anonymous access is rate-limited (~100 req/day). [Register here](https://opensky-network.org/index.php/register)

## Project Structure

```
skybuddy/
├── index.html          # Main entry point
├── css/
│   └── style.css       # All styles (HUD, panels, controls, responsive)
├── js/
│   └── app.js          # Application logic (data fetch, globe render, UI)
├── assets/
│   └── favicon.svg     # App icon
├── manifest.json       # PWA manifest
├── nginx.conf          # Nginx site config for deployment
├── .gitignore
└── README.md
```

## Running Locally

No build step required — this is a static site. Serve it with any HTTP server:

```bash
# Python
python3 -m http.server 8080 --directory /root/skybuddy

# Node
npx serve /root/skybuddy

# Open in browser
open http://localhost:8080
```

## Deployment (Nginx)

The project includes an nginx config. To deploy:

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-enabled/skybuddy

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

The site will be served at `http://<your-server-ip>:8070`.

## API Notes

- **OpenSky Network** API returns aircraft state vectors (position, velocity, heading, etc.)
- Anonymous users: ~100 requests/day, ~10s rate limit
- Authenticated users: ~4000 requests/day
- Data auto-refreshes every 10 seconds
- Bounding box queries are used when zoomed in (lat span < 40°)

## Keyboard Shortcuts

| Key   | Action         |
|-------|----------------|
| `L`   | Toggle labels  |
| `T`   | Toggle trails  |
| `H`   | Fly to home    |
| `R`   | Refresh data   |
| `Esc` | Close detail   |

## License

MIT
