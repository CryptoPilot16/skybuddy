# Skybuddy Dev Instructions

## Rules
- CSS lives in `css/style.css`, JS in `js/app.js`, HTML in `index.html`.
- Cesium.js is loaded via CDN — do NOT npm install it.
- Never hardcode API tokens. Always use the input form or localStorage.
- OpenSky free tier rate limit: 10s minimum between requests. Never go below this.
- All altitude displays in feet, speeds in knots, vert rate in fpm. No metric in the UI.
- Keep the terminal/aviation HUD aesthetic (dark bg, green accent, JetBrains Mono).

## Testing
- Open index.html in browser, paste Cesium token, verify globe loads + aircraft appear.
- Test with viewport zoomed into a busy area (Europe, US East Coast) for best results.

## When modifying
- Keep entity management efficient — always clean up stale entities.
- Cesium entity count > 5000 will degrade performance. Cap the list.
- OpenSky returns null lat/lon for some aircraft — always null-check before creating entities.
- Deployed via Caddy at skybuddy.clawnux.com.
