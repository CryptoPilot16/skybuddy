// SKYBUDDY // 3D Flight Tracker — Core Application
// Powered by Cesium.js + OpenSky Network

// ─── State ───
let viewer = null;
let aircraftEntities = {};
let aircraftData = {};
let selectedAc = null;
let trackingAc = null;
let showLabels = true;
let showPaths = false;
let osUser = '';
let osPass = '';
let refreshInterval = null;
let trailPositions = {};
let stats = { totalTracked: 0, sessionStart: null };
let showPrediction = false;
let showAirports = false;
let predictionEntities = [];
let airportEntities = [];
let altFilterMin = 0;
let altFilterMax = 50000;
let dataSourceMode = 'adsbx'; // 'opensky' | 'adsbx' — default to ADSB.lol for aircraft type data
let failedSources = new Set();
let globeFilter = ''; // search filter applied to globe entities too
let watchlist = []; // persistent airline/callsign filter
let watchlistActive = false;

// ─── Config ───
const CONFIG = {
  REFRESH_INTERVAL: 10000,       // ms between data fetches
  MAX_LIST_ITEMS: 200,           // max aircraft in side panel list
  MAX_TRAIL_POINTS: 150,         // max trail coordinate triples
  DEFAULT_CENTER: [-9.14, 38.74], // Lisbon
  DEFAULT_ALTITUDE: 8000000,
  ZOOM_BOUNDING_LAT: 40,        // skip bounding box if view > 40° lat
  FLY_DURATION: 2,              // camera fly-to seconds
  TRACK_FLY_DURATION: 1.5,
  PREDICTION_SECONDS: 60,       // seconds to project heading vector
  AIRPORT_MIN_ZOOM_ALT: 2000000, // show airports below this camera altitude
};

// ─── Major Airports Database ───
const AIRPORTS = [
  { icao: 'KJFK', name: 'JFK Intl', lat: 40.6413, lon: -73.7781 },
  { icao: 'KLAX', name: 'Los Angeles', lat: 33.9425, lon: -118.4081 },
  { icao: 'EGLL', name: 'Heathrow', lat: 51.4700, lon: -0.4543 },
  { icao: 'LFPG', name: 'Charles de Gaulle', lat: 49.0097, lon: 2.5479 },
  { icao: 'EDDF', name: 'Frankfurt', lat: 50.0379, lon: 8.5622 },
  { icao: 'EHAM', name: 'Schiphol', lat: 52.3086, lon: 4.7639 },
  { icao: 'OMDB', name: 'Dubai Intl', lat: 25.2532, lon: 55.3657 },
  { icao: 'VHHH', name: 'Hong Kong', lat: 22.3080, lon: 113.9185 },
  { icao: 'RJTT', name: 'Tokyo Haneda', lat: 35.5494, lon: 139.7798 },
  { icao: 'ZBAA', name: 'Beijing Capital', lat: 40.0799, lon: 116.6031 },
  { icao: 'YSSY', name: 'Sydney', lat: -33.9461, lon: 151.1772 },
  { icao: 'LPPT', name: 'Lisbon', lat: 38.7756, lon: -9.1354 },
  { icao: 'LEMD', name: 'Madrid Barajas', lat: 40.4983, lon: -3.5676 },
  { icao: 'LIRF', name: 'Rome Fiumicino', lat: 41.8003, lon: 12.2389 },
  { icao: 'LSZH', name: 'Zurich', lat: 47.4647, lon: 8.5492 },
  { icao: 'LTFM', name: 'Istanbul', lat: 41.2753, lon: 28.7519 },
  { icao: 'WSSS', name: 'Singapore Changi', lat: 1.3502, lon: 103.9944 },
  { icao: 'KATL', name: 'Atlanta', lat: 33.6407, lon: -84.4277 },
  { icao: 'KORD', name: "Chicago O'Hare", lat: 41.9742, lon: -87.9073 },
  { icao: 'KDFW', name: 'Dallas/Fort Worth', lat: 32.8998, lon: -97.0403 },
  { icao: 'KDEN', name: 'Denver', lat: 39.8561, lon: -104.6737 },
  { icao: 'KSFO', name: 'San Francisco', lat: 37.6213, lon: -122.3790 },
  { icao: 'CYYZ', name: 'Toronto Pearson', lat: 43.6777, lon: -79.6248 },
  { icao: 'SBGR', name: 'Sao Paulo', lat: -23.4356, lon: -46.4731 },
  { icao: 'FAOR', name: 'Johannesburg', lat: -26.1392, lon: 28.2460 },
  { icao: 'VIDP', name: 'Delhi', lat: 28.5562, lon: 77.1000 },
  { icao: 'VTBS', name: 'Bangkok', lat: 13.6900, lon: 100.7501 },
  { icao: 'RKSI', name: 'Seoul Incheon', lat: 37.4602, lon: 126.4407 },
  { icao: 'NZAA', name: 'Auckland', lat: -37.0082, lon: 174.7850 },
  { icao: 'BIKF', name: 'Keflavik', lat: 63.9850, lon: -22.6056 },
  { icao: 'KMIA', name: 'Miami', lat: 25.7959, lon: -80.2870 },
  { icao: 'EIDW', name: 'Dublin', lat: 53.4213, lon: -6.2701 },
  { icao: 'ENGM', name: 'Oslo', lat: 60.1939, lon: 11.1004 },
  { icao: 'ESSA', name: 'Stockholm', lat: 59.6519, lon: 17.9186 },
  { icao: 'EKCH', name: 'Copenhagen', lat: 55.6181, lon: 12.6560 },
  { icao: 'EFHK', name: 'Helsinki', lat: 60.3172, lon: 24.9633 },
  { icao: 'LOWW', name: 'Vienna', lat: 48.1103, lon: 16.5697 },
  { icao: 'EPWA', name: 'Warsaw', lat: 52.1657, lon: 20.9671 },
  { icao: 'LEBL', name: 'Barcelona', lat: 41.2971, lon: 2.0785 },
  { icao: 'EGKK', name: 'London Gatwick', lat: 51.1537, lon: -0.1821 },
];

// ─── Unit Conversions ───
const msToKts = (ms) => ms ? Math.round(ms * 1.94384) : 0;
const mToFt = (m) => m ? Math.round(m * 3.28084) : 0;
const msToFpm = (ms) => ms ? Math.round(ms * 196.85) : 0;

// ─── Aircraft Type → Model Mapping ───
const MODEL_MAP = {
  // 747 variants
  'B741': 'assets/b747.glb', 'B742': 'assets/b747.glb', 'B743': 'assets/b747.glb',
  'B744': 'assets/b747.glb', 'B748': 'assets/b747.glb', 'B74S': 'assets/b747.glb',
  'B74D': 'assets/b747.glb', 'B74R': 'assets/b747.glb',
  // 777 variants
  'B772': 'assets/b777.glb', 'B773': 'assets/b777.glb', 'B77L': 'assets/b777.glb',
  'B77W': 'assets/b777.glb', 'B778': 'assets/b777.glb', 'B779': 'assets/b777.glb',
  // Wide-body
  'A332': 'assets/wide.glb', 'A333': 'assets/wide.glb', 'A338': 'assets/wide.glb',
  'A339': 'assets/wide.glb', 'A342': 'assets/wide.glb', 'A343': 'assets/wide.glb',
  'A345': 'assets/wide.glb', 'A346': 'assets/wide.glb',
  'A359': 'assets/wide.glb', 'A35K': 'assets/wide.glb',
  'B762': 'assets/wide.glb', 'B763': 'assets/wide.glb', 'B764': 'assets/wide.glb',
  'B788': 'assets/wide.glb', 'B789': 'assets/wide.glb', 'B78X': 'assets/wide.glb',
  'MD11': 'assets/wide.glb', 'DC10': 'assets/wide.glb',
};

function getModelUri(typeCode) {
  if (!typeCode) return 'assets/narrow.glb';
  const code = typeCode.toUpperCase();
  if (MODEL_MAP[code]) return MODEL_MAP[code];
  // Guess by prefix
  if (code.startsWith('B74')) return 'assets/b747.glb';
  if (code.startsWith('B77')) return 'assets/b777.glb';
  if (code.startsWith('A3') || code.startsWith('B76') || code.startsWith('B78')) return 'assets/wide.glb';
  return 'assets/narrow.glb';
}

// ─── Notifications ───
function notify(message, type = 'info') {
  const el = document.getElementById('notification');
  el.textContent = message;
  el.className = 'notification show' + (type === 'error' ? ' error' : '');
  setTimeout(() => { el.className = 'notification'; }, 3000);
}

// ─── Credential Persistence ───
function saveCredentials(token, user, pass) {
  try {
    localStorage.setItem('skybuddy_cesium_token', token);
    if (user) localStorage.setItem('skybuddy_os_user', user);
    if (pass) localStorage.setItem('skybuddy_os_pass', pass);
  } catch (e) { /* localStorage unavailable */ }
}

function loadCredentials() {
  try {
    return {
      token: localStorage.getItem('skybuddy_cesium_token') || '',
      user: localStorage.getItem('skybuddy_os_user') || '',
      pass: localStorage.getItem('skybuddy_os_pass') || '',
    };
  } catch (e) { return { token: '', user: '', pass: '' }; }
}

function clearCredentials() {
  try {
    localStorage.removeItem('skybuddy_cesium_token');
    localStorage.removeItem('skybuddy_os_user');
    localStorage.removeItem('skybuddy_os_pass');
  } catch (e) { /* noop */ }
}

// ─── Watchlist Persistence ───
function saveWatchlist() {
  try { localStorage.setItem('skybuddy_watchlist', JSON.stringify(watchlist)); } catch (e) {}
}
function loadWatchlist() {
  try {
    const saved = localStorage.getItem('skybuddy_watchlist');
    if (saved) {
      watchlist = JSON.parse(saved);
    } else {
      // First visit defaults: Kalitta Air
      watchlist = ['CKS'];
      watchlistActive = true;
      saveWatchlist();
      saveWatchlistActive();
    }
    const active = localStorage.getItem('skybuddy_watchlist_active');
    if (active !== null) watchlistActive = active === 'true';
  } catch (e) {}
}
function saveWatchlistActive() {
  try { localStorage.setItem('skybuddy_watchlist_active', watchlistActive); } catch (e) {}
}

function addToWatchlist(entry) {
  const val = entry.toUpperCase().trim();
  if (!val || watchlist.includes(val)) return;
  watchlist.push(val);
  saveWatchlist();
  renderWatchlistPanel();
  if (watchlistActive) { updateGlobe(); renderAircraftList(); }
  notify('Added "' + val + '" to watchlist');
}

function removeFromWatchlist(entry) {
  watchlist = watchlist.filter(w => w !== entry);
  saveWatchlist();
  renderWatchlistPanel();
  if (watchlistActive) { updateGlobe(); renderAircraftList(); }
}

function toggleWatchlistActive() {
  watchlistActive = !watchlistActive;
  saveWatchlistActive();
  document.getElementById('btnWatchlist').classList.toggle('active', watchlistActive);
  document.getElementById('watchlistStatus').textContent = watchlistActive ? 'ACTIVE' : 'OFF';
  document.getElementById('watchlistStatus').style.color = watchlistActive ? 'var(--accent)' : 'var(--text-dim)';
  // Clear globe and rebuild
  Object.keys(aircraftEntities).forEach(icao => {
    viewer.entities.remove(aircraftEntities[icao]);
    delete aircraftEntities[icao];
  });
  updateGlobe();
  renderAircraftList();
  notify('Watchlist ' + (watchlistActive ? 'ON — showing only watched aircraft' : 'OFF — showing all'));
}

function passesWatchlist(ac) {
  if (!watchlistActive || watchlist.length === 0) return true;
  const cs = (ac.callsign || '').toUpperCase();
  const icao = ac.icao.toUpperCase();
  const country = (ac.country || '').toUpperCase();
  return watchlist.some(w => cs.startsWith(w) || cs.includes(w) || icao.includes(w) || country === w);
}

function toggleWatchlistPanel() {
  const panel = document.getElementById('watchlistPanel');
  panel.classList.toggle('visible');
}

function renderWatchlistPanel() {
  const list = document.getElementById('watchlistItems');
  if (!list) return;
  list.innerHTML = watchlist.map(w =>
    `<div class="wl-item"><span class="wl-name">${w}</span><button class="wl-remove" onclick="removeFromWatchlist('${w}')">✕</button></div>`
  ).join('') || '<div class="wl-empty">No entries — add callsign prefixes above</div>';
}

// ─── Initialization ───
function initApp() {
  const token = document.getElementById('cesiumToken').value.trim();
  if (!token) {
    document.getElementById('cesiumToken').style.borderColor = '#ff6b35';
    notify('Cesium token is required', 'error');
    return;
  }

  osUser = document.getElementById('osUser').value.trim();
  osPass = document.getElementById('osPass').value.trim();

  // Persist credentials
  saveCredentials(token, osUser, osPass);

  document.getElementById('setupPanel').style.display = 'none';
  document.getElementById('loadingOverlay').style.display = 'flex';

  Cesium.Ion.defaultAccessToken = token;

  try {
    viewer = new Cesium.Viewer('cesiumContainer', {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shadows: false,
      shouldAnimate: true,
    });

    viewer.scene.globe.enableLighting = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0003;
    viewer.scene.globe.showGroundAtmosphere = true;

    // Click handler for aircraft selection
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(function (click) {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id._acIcao) {
        selectAircraft(picked.id._acIcao);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Start centered on default location
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        CONFIG.DEFAULT_CENTER[0], CONFIG.DEFAULT_CENTER[1], CONFIG.DEFAULT_ALTITUDE
      ),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
      duration: 0,
    });

    document.getElementById('loadingText').textContent = 'Fetching aircraft...';
    stats.sessionStart = new Date();

    fetchAircraft().then(() => {
      const overlay = document.getElementById('loadingOverlay');
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.style.display = 'none', 600);
      notify('SKYBUDDY online — tracking live aircraft');
    });

    refreshInterval = setInterval(fetchAircraft, CONFIG.REFRESH_INTERVAL);
    document.getElementById('searchBox').addEventListener('input', () => {
      globeFilter = (document.getElementById('searchBox').value || '').toUpperCase();
      updateGlobe();
      renderAircraftList();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

  } catch (err) {
    document.getElementById('loadingText').textContent = 'Error: ' + err.message;
    notify('Failed to initialize: ' + err.message, 'error');
  }
}

// ─── Auto-login ───
function tryAutoLogin() {
  const creds = loadCredentials();
  const token = creds.token || (window.ENV && window.ENV.CESIUM_ION_TOKEN) || '';
  if (token) document.getElementById('cesiumToken').value = token;
  if (creds.user) document.getElementById('osUser').value = creds.user;
  if (creds.pass) document.getElementById('osPass').value = creds.pass;
  loadWatchlist();
  renderWatchlistPanel();
  document.getElementById('btnWatchlist').classList.toggle('active', watchlistActive);
  document.getElementById('watchlistStatus').textContent = watchlistActive ? 'ACTIVE' : 'OFF';
  document.getElementById('watchlistStatus').style.color = watchlistActive ? 'var(--accent)' : 'var(--text-dim)';
}

// ─── Keyboard Shortcuts ───
function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key.toLowerCase()) {
    case 'l': toggleLabels(); break;
    case 't': togglePaths(); break;
    case 'h': flyHome(); break;
    case 'r': refreshData(); break;
    case 'p': togglePrediction(); break;
    case 'a': toggleAirports(); break;
    case 'f': toggleAltFilter(); break;
    case 'w': toggleWatchlistPanel(); break;
    case 'escape':
      if (selectedAc) closeDetail();
      break;
  }
}

// ─── Data Sources ───
function buildOpenSkyUrl(rect) {
  let url = 'https://opensky-network.org/api/states/all';
  if (rect) {
    const west = Cesium.Math.toDegrees(rect.west).toFixed(2);
    const south = Cesium.Math.toDegrees(rect.south).toFixed(2);
    const east = Cesium.Math.toDegrees(rect.east).toFixed(2);
    const north = Cesium.Math.toDegrees(rect.north).toFixed(2);
    if ((north - south) < CONFIG.ZOOM_BOUNDING_LAT) {
      url += `?lamin=${south}&lomin=${west}&lamax=${north}&lomax=${east}`;
    }
  }
  return url;
}

function buildAdsbLolUrl(rect) {
  // No rect = fetch globally (watchlist mode)
  if (!rect) return 'https://api.adsb.lol/v2/ladd';
  const west = Cesium.Math.toDegrees(rect.west).toFixed(2);
  const south = Cesium.Math.toDegrees(rect.south).toFixed(2);
  const east = Cesium.Math.toDegrees(rect.east).toFixed(2);
  const north = Cesium.Math.toDegrees(rect.north).toFixed(2);
  if ((north - south) < CONFIG.ZOOM_BOUNDING_LAT) {
    return `https://api.adsb.lol/v2/lat/${((+north + +south) / 2).toFixed(4)}/lon/${((+east + +west) / 2).toFixed(4)}/dist/250`;
  }
  return 'https://api.adsb.lol/v2/ladd';
}

function parseOpenSkyData(data) {
  if (!data.states) return {};
  const result = {};
  data.states.forEach(s => {
    result[s[0]] = {
      icao: s[0],
      callsign: (s[1] || '').trim(),
      country: s[2] || '',
      lon: s[5], lat: s[6],
      alt: s[7],
      onGround: s[8],
      velocity: s[9],
      heading: s[10],
      vertRate: s[11],
      geoAlt: s[13],
      acType: null,
    };
  });
  return result;
}

function parseAdsbLolData(data) {
  if (!data.ac) return {};
  const result = {};
  data.ac.forEach(a => {
    const icao = (a.hex || '').trim();
    if (!icao) return;
    result[icao] = {
      icao: icao,
      callsign: (a.flight || '').trim(),
      country: a.r || '',
      lon: a.lon, lat: a.lat,
      alt: a.alt_baro !== 'ground' ? (a.alt_baro ? a.alt_baro * 0.3048 : null) : null,
      onGround: a.alt_baro === 'ground',
      velocity: a.gs ? a.gs * 0.514444 : null,
      heading: a.track || a.true_heading,
      vertRate: a.baro_rate ? a.baro_rate * 0.00508 : null,
      geoAlt: a.alt_geom ? a.alt_geom * 0.3048 : null,
      acType: a.t || null, // e.g. "B744", "B77W"
      registration: a.r || null,
      acDesc: a.desc || null,
    };
  });
  return result;
}

function cycleDataSource() {
  const sources = ['opensky', 'adsbx'];
  const idx = sources.indexOf(dataSourceMode);
  dataSourceMode = sources[(idx + 1) % sources.length];
  failedSources.clear();
  document.getElementById('dataSource').textContent = dataSourceMode === 'opensky' ? 'OPENSKY' : 'ADSB.LOL';
  notify('Switched to ' + (dataSourceMode === 'opensky' ? 'OpenSky' : 'ADSB.lol'));
  fetchAircraft();
}

// ─── Data Fetching ───
async function fetchAircraft() {
  // When watchlist is active, fetch globally (no bounding box) to find all watched aircraft worldwide
  const rect = watchlistActive ? null : viewer.camera.computeViewRectangle();
  const sources = dataSourceMode === 'opensky'
    ? ['opensky', 'adsbx']
    : ['adsbx', 'opensky'];

  for (const source of sources) {
    if (failedSources.has(source)) continue;
    try {
      let url, headers = {}, parser;

      if (source === 'opensky') {
        url = buildOpenSkyUrl(rect);
        if (osUser && osPass) {
          headers['Authorization'] = 'Basic ' + btoa(osUser + ':' + osPass);
        }
        parser = parseOpenSkyData;
      } else {
        url = buildAdsbLolUrl(rect);
        parser = parseAdsbLolData;
      }

      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        console.warn(source, resp.status);
        if (resp.status === 429) {
          failedSources.add(source);
          notify(source + ' rate limited — trying fallback', 'error');
          continue;
        }
        continue;
      }

      const data = await resp.json();
      const newData = parser(data);
      if (Object.keys(newData).length === 0) continue;

      document.getElementById('pulseDot').style.background = 'var(--accent)';
      const now = new Date();
      document.getElementById('lastUpdate').textContent = now.toTimeString().split(' ')[0];
      document.getElementById('acCount').textContent = Object.keys(newData).length;
      document.getElementById('dataSource').textContent = source === 'opensky' ? 'OPENSKY' : 'ADSB.LOL';
      stats.totalTracked = Math.max(stats.totalTracked, Object.keys(newData).length);

      aircraftData = newData;
      updateGlobe();
      renderAircraftList();

      if (selectedAc && aircraftData[selectedAc]) {
        updateDetailPanel(aircraftData[selectedAc]);
      }
      return; // success
    } catch (err) {
      console.warn(source, 'fetch error:', err);
      failedSources.add(source);
    }
  }

  // All sources failed
  document.getElementById('pulseDot').style.background = 'var(--warn)';
  notify('All data sources unavailable', 'error');
  // Reset failed sources for next cycle
  setTimeout(() => failedSources.clear(), 30000);
}

// ─── Globe Rendering ───
function updateGlobe() {
  const currentIcaos = new Set(Object.keys(aircraftData));

  // Remove stale entities
  Object.keys(aircraftEntities).forEach(icao => {
    if (!currentIcaos.has(icao)) {
      viewer.entities.remove(aircraftEntities[icao]);
      delete aircraftEntities[icao];
      delete trailPositions[icao];
    }
  });

  // Update or create entities
  Object.values(aircraftData).forEach(ac => {
    if (ac.lat == null || ac.lon == null) return;

    // Filter: hide entities that don't pass watchlist, altitude, or search filter
    if (!passesWatchlist(ac) || !passesAltFilter(ac) || !passesGlobeFilter(ac)) {
      if (aircraftEntities[ac.icao]) {
        viewer.entities.remove(aircraftEntities[ac.icao]);
        delete aircraftEntities[ac.icao];
      }
      return;
    }

    const alt = ac.onGround ? 100 : (ac.alt || ac.geoAlt || 1000);
    const position = Cesium.Cartesian3.fromDegrees(ac.lon, ac.lat, alt);

    // Trail tracking
    if (showPaths && !ac.onGround) {
      if (!trailPositions[ac.icao]) trailPositions[ac.icao] = [];
      trailPositions[ac.icao].push(ac.lon, ac.lat, alt);
      if (trailPositions[ac.icao].length > CONFIG.MAX_TRAIL_POINTS) {
        trailPositions[ac.icao] = trailPositions[ac.icao].slice(-CONFIG.MAX_TRAIL_POINTS);
      }
    }

    const hdgRad = Cesium.Math.toRadians(ac.heading || 0);
    const pitchRad = ac.vertRate ? Cesium.Math.toRadians(Math.max(-30, Math.min(30, ac.vertRate * 3))) : 0;
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      new Cesium.HeadingPitchRoll(hdgRad, pitchRad, 0)
    );

    const modelUri = getModelUri(ac.acType);

    if (aircraftEntities[ac.icao]) {
      const entity = aircraftEntities[ac.icao];
      entity.position = position;
      entity.orientation = orientation;

      // Switch model if type changed (e.g. first fetch had no type, update has it)
      if (entity._modelUri !== modelUri) {
        entity.model.uri = modelUri;
        entity._modelUri = modelUri;
      }

      if (entity.label) {
        entity.label.show = showLabels && !!ac.callsign;
        entity.label.text = ac.callsign || ac.icao;
      }

      if (showPaths && trailPositions[ac.icao] && trailPositions[ac.icao].length >= 6) {
        entity.polyline = {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(trailPositions[ac.icao]),
          width: 1.5,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.2,
            color: Cesium.Color.fromCssColorString('rgba(0,255,136,0.4)'),
          }),
        };
      }
    } else {
      const entity = viewer.entities.add({
        position: position,
        orientation: orientation,
        model: {
          uri: modelUri,
          minimumPixelSize: 28,
          maximumScale: 600,
          scale: 1.0,
          silhouetteColor: Cesium.Color.fromCssColorString('#00ff88').withAlpha(0.4),
          silhouetteSize: 1.5,
        },
        label: {
          text: ac.callsign || ac.icao,
          font: '11px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString('#c8d6e5'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(20, -10),
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e6, 0.0),
          show: showLabels && !!ac.callsign,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      entity._acIcao = ac.icao;
      entity._modelUri = modelUri;
      aircraftEntities[ac.icao] = entity;
    }
  });

  // Redraw predictions if active
  if (showPrediction) drawPredictions();

  // Camera tracking
  if (trackingAc && aircraftData[trackingAc]) {
    const ac = aircraftData[trackingAc];
    const alt = ac.alt || ac.geoAlt || 5000;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(ac.lon, ac.lat, alt + 50000),
      orientation: {
        heading: Cesium.Math.toRadians(ac.heading || 0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0,
      },
      duration: CONFIG.TRACK_FLY_DURATION,
    });
  }
}

// ─── Altitude Color Mapping ───
function altitudeColor(altMeters) {
  const ft = altMeters * 3.28084;
  if (ft < 5000) return Cesium.Color.fromCssColorString('#00ff88');
  if (ft < 15000) return Cesium.Color.fromCssColorString('#00b4d8');
  if (ft < 30000) return Cesium.Color.fromCssColorString('#ff9f1c');
  return Cesium.Color.fromCssColorString('#ff6b35');
}

// ─── Aircraft List ───
function renderAircraftList() {
  const list = document.getElementById('aircraftList');
  const filter = (document.getElementById('searchBox').value || '').toUpperCase();

  const sorted = Object.values(aircraftData)
    .filter(ac => ac.lat && ac.lon && (watchlistActive ? true : !ac.onGround) && passesWatchlist(ac) && passesAltFilter(ac))
    .filter(ac =>
      !filter ||
      (ac.callsign && ac.callsign.toUpperCase().includes(filter)) ||
      ac.icao.toUpperCase().includes(filter) ||
      ac.country.toUpperCase().includes(filter)
    )
    .sort((a, b) => (b.alt || 0) - (a.alt || 0))
    .slice(0, CONFIG.MAX_LIST_ITEMS);

  list.innerHTML = sorted
    .map(
      ac => `
    <div class="ac-item ${selectedAc === ac.icao ? 'selected' : ''}" onclick="selectAircraft('${ac.icao}')">
      <span class="ac-callsign">${ac.callsign || ac.icao}</span>
      <span class="ac-alt">${mToFt(ac.alt).toLocaleString()} ft</span>
      <span class="ac-origin">${ac.acType || ac.country}</span>
      <span class="ac-speed">${msToKts(ac.velocity)} kts</span>
    </div>
  `
    )
    .join('');
}

// ─── Aircraft Selection ───
function selectAircraft(icao) {
  selectedAc = icao;
  const ac = aircraftData[icao];
  if (!ac) return;

  updateDetailPanel(ac);
  document.getElementById('detailPanel').classList.add('visible');

  const btn = document.getElementById('btnTrack');
  btn.textContent = trackingAc === icao ? '■ STOP TRACKING' : '◎ TRACK AIRCRAFT';
  btn.classList.toggle('tracking', trackingAc === icao);

  const alt = ac.alt || ac.geoAlt || 5000;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(ac.lon, ac.lat, alt + 80000),
    orientation: {
      heading: Cesium.Math.toRadians(ac.heading || 0),
      pitch: Cesium.Math.toRadians(-40),
      roll: 0,
    },
    duration: CONFIG.FLY_DURATION,
  });

  renderAircraftList();
}

function updateDetailPanel(ac) {
  document.getElementById('detCallsign').textContent = ac.callsign || ac.icao;
  document.getElementById('detCountry').textContent = ac.country;
  document.getElementById('detAlt').textContent = mToFt(ac.alt).toLocaleString();
  document.getElementById('detSpeed').textContent = msToKts(ac.velocity);
  document.getElementById('detHdg').textContent = Math.round(ac.heading || 0);
  document.getElementById('detVsi').textContent = msToFpm(ac.vertRate);
  document.getElementById('detLat').textContent = (ac.lat || 0).toFixed(4);
  document.getElementById('detLon').textContent = (ac.lon || 0).toFixed(4);
  document.getElementById('detIcao').textContent = ac.icao;
  document.getElementById('detType').textContent = ac.acType || '—';
  document.getElementById('detGnd').textContent = ac.onGround ? 'YES' : 'NO';
}

function closeDetail() {
  document.getElementById('detailPanel').classList.remove('visible');
  selectedAc = null;
  trackingAc = null;
  renderAircraftList();
}

// ─── Tracking ───
function toggleTracking() {
  trackingAc = trackingAc === selectedAc ? null : selectedAc;
  const btn = document.getElementById('btnTrack');
  btn.textContent = trackingAc ? '■ STOP TRACKING' : '◎ TRACK AIRCRAFT';
  btn.classList.toggle('tracking', !!trackingAc);
  if (trackingAc) notify('Tracking ' + (aircraftData[trackingAc]?.callsign || trackingAc));
}

// ─── Controls ───
function toggleLabels() {
  showLabels = !showLabels;
  document.getElementById('btnLabels').classList.toggle('active', showLabels);
  Object.values(aircraftEntities).forEach(e => {
    if (e.label) e.label.show = showLabels;
  });
  notify('Labels ' + (showLabels ? 'on' : 'off'));
}

function togglePaths() {
  showPaths = !showPaths;
  document.getElementById('btnPaths').classList.toggle('active', showPaths);
  if (!showPaths) {
    trailPositions = {};
    Object.values(aircraftEntities).forEach(e => {
      e.polyline = undefined;
    });
  }
  notify('Trails ' + (showPaths ? 'on' : 'off'));
}

function flyHome() {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      CONFIG.DEFAULT_CENTER[0], CONFIG.DEFAULT_CENTER[1], CONFIG.DEFAULT_ALTITUDE
    ),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 },
    duration: CONFIG.FLY_DURATION,
  });
}

function refreshData() {
  notify('Refreshing...');
  fetchAircraft();
}

function logout() {
  clearCredentials();
  if (refreshInterval) clearInterval(refreshInterval);
  location.reload();
}

function toggleSidePanel() {
  const panel = document.getElementById('sidePanel');
  const btn = document.getElementById('toggleBtn');
  panel.classList.add('hidden');
  btn.style.display = 'block';
}

function showSidePanel() {
  const panel = document.getElementById('sidePanel');
  const btn = document.getElementById('toggleBtn');
  panel.classList.remove('hidden');
  btn.style.display = 'none';
}

// ─── Altitude Filter ───
function toggleAltFilter() {
  const panel = document.getElementById('altFilter');
  panel.classList.toggle('visible');
  document.getElementById('btnAltFilter').classList.toggle('active', panel.classList.contains('visible'));
}

function updateAltFilter() {
  altFilterMin = parseInt(document.getElementById('altMinSlider').value);
  altFilterMax = parseInt(document.getElementById('altMaxSlider').value);
  // Ensure min <= max
  if (altFilterMin > altFilterMax) {
    document.getElementById('altMinSlider').value = altFilterMax;
    altFilterMin = altFilterMax;
  }
  document.getElementById('altMinLabel').textContent = altFilterMin >= 1000 ? (altFilterMin / 1000) + 'K ft' : altFilterMin + ' ft';
  document.getElementById('altMaxLabel').textContent = altFilterMax >= 1000 ? (altFilterMax / 1000) + 'K ft' : altFilterMax + ' ft';
  document.getElementById('altFilterValue').textContent =
    (altFilterMin === 0 && altFilterMax === 50000) ? 'All' : `${altFilterMin.toLocaleString()}–${altFilterMax.toLocaleString()} ft`;
  updateGlobe();
  renderAircraftList();
}

function resetAltFilter() {
  document.getElementById('altMinSlider').value = 0;
  document.getElementById('altMaxSlider').value = 50000;
  altFilterMin = 0;
  altFilterMax = 50000;
  document.getElementById('altMinLabel').textContent = '0 ft';
  document.getElementById('altMaxLabel').textContent = '50K ft';
  document.getElementById('altFilterValue').textContent = 'All';
  updateGlobe();
  renderAircraftList();
}

function passesAltFilter(ac) {
  if (altFilterMin === 0 && altFilterMax === 50000) return true;
  const ft = mToFt(ac.alt || ac.geoAlt || 0);
  return ft >= altFilterMin && ft <= altFilterMax;
}

function passesGlobeFilter(ac) {
  if (!globeFilter) return true;
  return (ac.callsign && ac.callsign.toUpperCase().includes(globeFilter)) ||
    ac.icao.toUpperCase().includes(globeFilter) ||
    ac.country.toUpperCase().includes(globeFilter);
}

// ─── Flight Prediction ───
function togglePrediction() {
  showPrediction = !showPrediction;
  document.getElementById('btnPredict').classList.toggle('active', showPrediction);
  document.getElementById('predictionLegend').style.display = showPrediction ? 'block' : 'none';
  if (!showPrediction) clearPredictions();
  else drawPredictions();
}

function clearPredictions() {
  predictionEntities.forEach(e => viewer.entities.remove(e));
  predictionEntities = [];
}

function drawPredictions() {
  clearPredictions();
  Object.values(aircraftData).forEach(ac => {
    if (!ac.lat || !ac.lon || ac.onGround || !ac.velocity || !ac.heading) return;
    if (!passesAltFilter(ac)) return;

    const alt = ac.alt || ac.geoAlt || 1000;
    const speedMps = ac.velocity; // already m/s
    const hdgRad = Cesium.Math.toRadians(ac.heading);
    const dist = speedMps * CONFIG.PREDICTION_SECONDS;

    // Approximate destination (flat earth approx for short distances)
    const dLat = (dist * Math.cos(hdgRad)) / 111320;
    const dLon = (dist * Math.sin(hdgRad)) / (111320 * Math.cos(Cesium.Math.toRadians(ac.lat)));
    const predLat = ac.lat + dLat;
    const predLon = ac.lon + dLon;
    const predAlt = alt + (ac.vertRate || 0) * CONFIG.PREDICTION_SECONDS;

    const entity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          ac.lon, ac.lat, alt,
          predLon, predLat, Math.max(predAlt, 50),
        ]),
        width: 2,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString('rgba(255,159,28,0.6)'),
          dashLength: 12,
        }),
      },
    });
    predictionEntities.push(entity);
  });
}

// ─── Airport Overlay ───
function toggleAirports() {
  showAirports = !showAirports;
  document.getElementById('btnAirports').classList.toggle('active', showAirports);
  if (showAirports) drawAirports();
  else clearAirports();
}

function clearAirports() {
  airportEntities.forEach(e => viewer.entities.remove(e));
  airportEntities = [];
}

function drawAirports() {
  clearAirports();
  AIRPORTS.forEach(apt => {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(apt.lon, apt.lat, 50),
      point: {
        pixelSize: 6,
        color: Cesium.Color.fromCssColorString('rgba(200, 214, 229, 0.8)'),
        outlineColor: Cesium.Color.fromCssColorString('rgba(200, 214, 229, 0.3)'),
        outlineWidth: 8,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: apt.icao,
        font: '10px JetBrains Mono',
        fillColor: Cesium.Color.fromCssColorString('rgba(200, 214, 229, 0.9)'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -14),
        scaleByDistance: new Cesium.NearFarScalar(5e4, 1.0, CONFIG.AIRPORT_MIN_ZOOM_ALT, 0.0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    airportEntities.push(entity);
  });
}

// ─── Init on Load ───
document.addEventListener('DOMContentLoaded', tryAutoLogin);
