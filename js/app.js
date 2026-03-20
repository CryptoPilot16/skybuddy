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
let orbitMode = false;
let gpsMode = false; // top-down north-up GPS-style tracking
let dataSourceMode = 'adsbx'; // 'opensky' | 'adsbx' — default to ADSB.lol for aircraft type data
let failedSources = new Set();
let globeFilter = ''; // search filter applied to globe entities too
let watchlist = []; // persistent airline/callsign filter
let watchlistActive = false;
let activeWebcam = null; // currently shown webcam ICAO
let routeCache = {}; // callsign → route data from VRS API
let schedule = []; // user's flight schedule
let scheduleMatches = new Map(); // scheduleId → icao24
let scheduleRouteEntities = []; // Cesium entities for schedule route lines
let showConflicts = false; // conflict zone overlay toggle
let conflictDataSource = null; // Cesium GeoJsonDataSource for conflict zones
let conflictFilterActive = false; // filter aircraft from conflict countries

// ─── Config ───
const CONFIG = {
  REFRESH_INTERVAL: 10000,       // ms between data fetches
  MAX_LIST_ITEMS: 200,           // max aircraft in side panel list
  MAX_TRAIL_POINTS: 150,         // max trail coordinate triples
  DEFAULT_CENTER: [-83.53, 42.24], // Willow Run / Kalitta HQ
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
  // Kalitta Air / cargo hubs
  { icao: 'KYIP', name: 'Willow Run (Kalitta HQ)', lat: 42.2379, lon: -83.5304 },
  { icao: 'PANC', name: 'Anchorage', lat: 61.1743, lon: -149.9962 },
  { icao: 'PAFA', name: 'Fairbanks', lat: 64.8151, lon: -147.8561 },
  { icao: 'KCVG', name: 'Cincinnati/NKY', lat: 39.0488, lon: -84.6678 },
  { icao: 'KSDF', name: 'Louisville (UPS Hub)', lat: 38.1744, lon: -85.7360 },
  { icao: 'KMEM', name: 'Memphis (FedEx Hub)', lat: 35.0424, lon: -89.9767 },
  { icao: 'KONT', name: 'Ontario Intl', lat: 34.0560, lon: -117.6012 },
  { icao: 'KRFD', name: 'Rockford', lat: 42.1954, lon: -89.0972 },
  { icao: 'KBFI', name: 'Boeing Field', lat: 47.5300, lon: -122.3019 },
  { icao: 'EDDK', name: 'Cologne/Bonn', lat: 50.8659, lon: 7.1427 },
  { icao: 'OBBI', name: 'Bahrain', lat: 26.2708, lon: 50.6336 },
  { icao: 'RKSS', name: 'Seoul Gimpo', lat: 37.5586, lon: 126.7906 },
  { icao: 'RJAA', name: 'Tokyo Narita', lat: 35.7647, lon: 140.3864 },
  { icao: 'VABB', name: 'Mumbai', lat: 19.0896, lon: 72.8656 },
  { icao: 'OMAA', name: 'Abu Dhabi', lat: 24.4430, lon: 54.6511 },
  { icao: 'RCTP', name: 'Taipei Taoyuan', lat: 25.0777, lon: 121.2325 },
  { icao: 'WMKK', name: 'Kuala Lumpur', lat: 2.7456, lon: 101.7099 },
  { icao: 'ZSPD', name: 'Shanghai Pudong', lat: 31.1434, lon: 121.8052 },
];

// ─── Unit Conversions ───
const msToKts = (ms) => ms ? Math.round(ms * 1.94384) : 0;
const mToFt = (m) => m ? Math.round(m * 3.28084) : 0;
const msToFpm = (ms) => ms ? Math.round(ms * 196.85) : 0;

// ─── Model Heading Offset ───
// FR24 GLB models have nose along -X axis instead of glTF convention -Z.
// Add 90° to heading so the nose points in the correct flight direction.
const MODEL_HEADING_OFFSET = Cesium.Math.toRadians(90);

// ─── Aircraft Type → Model Mapping (FR24 models) ───
const MODEL_MAP = {
  // 747 variants → b744.glb (747-400) or b748.glb (747-8)
  'B741': 'assets/b744.glb', 'B742': 'assets/b742.glb', 'B743': 'assets/b744.glb',
  'B744': 'assets/b744.glb', 'B74S': 'assets/b744.glb', 'B74D': 'assets/b744.glb',
  'B74R': 'assets/b744.glb', 'B748': 'assets/b748.glb',
  // 777 variants → b772.glb (777-200) or b773.glb (777-300)
  'B772': 'assets/b772.glb', 'B77L': 'assets/b772.glb',
  'B773': 'assets/b773.glb', 'B77W': 'assets/b773.glb',
  'B778': 'assets/b773.glb', 'B779': 'assets/b773.glb',
  // Wide-body (A330/A340/A350/767/787/MD11)
  'A332': 'assets/a333.glb', 'A333': 'assets/a333.glb', 'A338': 'assets/a333.glb',
  'A339': 'assets/a333.glb', 'A342': 'assets/a333.glb', 'A343': 'assets/a333.glb',
  'A345': 'assets/a333.glb', 'A346': 'assets/a333.glb',
  'A359': 'assets/a333.glb', 'A35K': 'assets/a333.glb',
  'B762': 'assets/a333.glb', 'B763': 'assets/a333.glb', 'B764': 'assets/a333.glb',
  'B788': 'assets/a333.glb', 'B789': 'assets/a333.glb', 'B78X': 'assets/a333.glb',
  'MD11': 'assets/a333.glb', 'DC10': 'assets/a333.glb',
  // Narrow-body
  'A318': 'assets/a320.glb', 'A319': 'assets/a320.glb', 'A320': 'assets/a320.glb',
  'A321': 'assets/a320.glb', 'A20N': 'assets/a320.glb', 'A21N': 'assets/a320.glb',
  'B731': 'assets/b738.glb', 'B732': 'assets/b738.glb', 'B733': 'assets/b738.glb',
  'B734': 'assets/b738.glb', 'B735': 'assets/b738.glb', 'B736': 'assets/b738.glb',
  'B737': 'assets/b738.glb', 'B738': 'assets/b738.glb', 'B739': 'assets/b738.glb',
  'B38M': 'assets/b738.glb', 'B39M': 'assets/b738.glb',
};

// Callsign → livery override (airline-specific paint jobs)
const LIVERY_MAP = {
  'CKS': 'assets/b744.glb', // Kalitta Air (Kalitta livery baked into b744)
};

// ─── Airline Definitions for Filter ───
const AIRLINES = {
  'CKS': { name: 'Kalitta Air', color: '#CC2222' },
  'GTI': { name: 'Atlas Air', color: '#1E90FF' },
};

// ─── Conflict Zones ───
// Countries with active armed conflicts (source: ACLED/UCDP/Conflictly)
// name must match the GeoJSON country name from johan/world.geo.json
const CONFLICT_COUNTRIES = [
  { name: 'Ukraine', iso: 'UKR', lat: 48.38, lon: 31.17, severity: 'war' },
  { name: 'Russia', iso: 'RUS', lat: 61.52, lon: 105.32, severity: 'war' },
  { name: 'Israel', iso: 'ISR', lat: 31.05, lon: 34.85, severity: 'war' },
  { name: 'Palestine', iso: 'PSE', lat: 31.95, lon: 35.23, severity: 'war' },
  { name: 'Sudan', iso: 'SDN', lat: 12.86, lon: 30.22, severity: 'war' },
  { name: 'Myanmar', iso: 'MMR', lat: 21.91, lon: 95.96, severity: 'war' },
  { name: 'Syria', iso: 'SYR', lat: 34.80, lon: 39.00, severity: 'high' },
  { name: 'Yemen', iso: 'YEM', lat: 15.55, lon: 48.52, severity: 'high' },
  { name: 'Somalia', iso: 'SOM', lat: 5.15, lon: 46.20, severity: 'high' },
  { name: 'Ethiopia', iso: 'ETH', lat: 9.15, lon: 40.49, severity: 'high' },
  { name: 'Democratic Republic of the Congo', iso: 'COD', lat: -4.04, lon: 21.76, severity: 'high' },
  { name: 'Nigeria', iso: 'NGA', lat: 9.08, lon: 7.49, severity: 'high' },
  { name: 'Mali', iso: 'MLI', lat: 17.57, lon: -4.00, severity: 'high' },
  { name: 'Burkina Faso', iso: 'BFA', lat: 12.24, lon: -1.56, severity: 'high' },
  { name: 'Niger', iso: 'NER', lat: 17.61, lon: 8.08, severity: 'medium' },
  { name: 'Afghanistan', iso: 'AFG', lat: 33.94, lon: 67.71, severity: 'medium' },
  { name: 'Iraq', iso: 'IRQ', lat: 33.22, lon: 43.68, severity: 'medium' },
  { name: 'Libya', iso: 'LBY', lat: 26.34, lon: 17.23, severity: 'medium' },
  { name: 'Haiti', iso: 'HTI', lat: 18.97, lon: -72.29, severity: 'medium' },
  { name: 'Colombia', iso: 'COL', lat: 4.57, lon: -74.30, severity: 'medium' },
  { name: 'Mozambique', iso: 'MOZ', lat: -18.67, lon: 35.53, severity: 'medium' },
  { name: 'Cameroon', iso: 'CMR', lat: 7.37, lon: 12.35, severity: 'medium' },
  { name: 'Central African Republic', iso: 'CAF', lat: 6.61, lon: 20.94, severity: 'medium' },
  { name: 'South Sudan', iso: 'SSD', lat: 6.88, lon: 31.31, severity: 'high' },
  { name: 'Lebanon', iso: 'LBN', lat: 33.85, lon: 35.86, severity: 'high' },
  { name: 'Chad', iso: 'TCD', lat: 15.45, lon: 18.73, severity: 'medium' },
  { name: 'Pakistan', iso: 'PAK', lat: 30.38, lon: 69.35, severity: 'medium' },
];

// Map origin_country (from OpenSky) to conflict status
const CONFLICT_COUNTRY_NAMES = new Set(CONFLICT_COUNTRIES.map(c => c.name.toUpperCase()));
// Also map common variations used by OpenSky
const CONFLICT_COUNTRY_ALIASES = {
  'CONGO (KINSHASA)': true, 'CONGO (DEM. REP.)': true, 'DR CONGO': true, 'DRC': true,
  'REPUBLIC OF SUDAN': true, 'REPUBLIC OF SOUTH SUDAN': true,
  'SYRIAN ARAB REPUBLIC': true, 'ISLAMIC REPUBLIC OF PAKISTAN': true,
  'FEDERAL REPUBLIC OF NIGERIA': true, 'STATE OF PALESTINE': true,
  'REPUBLIC OF HAITI': true, 'REPUBLIC OF COLOMBIA': true,
  'REPUBLIC OF CAMEROON': true, 'REPUBLIC OF CHAD': true,
  'REPUBLIC OF MALI': true, 'REPUBLIC OF NIGER': true,
};

function isConflictCountry(countryName) {
  if (!countryName) return false;
  const upper = countryName.toUpperCase().trim();
  return CONFLICT_COUNTRY_NAMES.has(upper) || CONFLICT_COUNTRY_ALIASES[upper] === true;
}

// ─── Airport Webcams (YouTube live embed IDs) ───
const AIRPORT_CAMS = {
  'KLAX': { name: 'LAX', cams: ['12KqO5IBLeY', 'UQaSS4_VAV4', 'PUv9hPZ-03U'] },
  'KJFK': { name: 'JFK', cams: ['11INCtK6uiA', 'UH3Ueo7a_L0'] },
  'KSFO': { name: 'SFO', cams: ['ThpFcm9vD7c', 'wRP2BtRYZ28'] },
  'EDDF': { name: 'FRA', cams: ['FnBCVaUh9R4', 'fHgbX19yY1Q'] },
  'RJAA': { name: 'NRT', cams: ['ZIHxOzhFFUc', 'TxNZkr8Fyyc'] },
  'LSZH': { name: 'ZRH', cams: ['Qcz9JKxFfW4'] },
};
const WEBCAM_TRIGGER_KM = 50;  // show webcam when aircraft within this range
const WEBCAM_DISMISS_KM = 80;  // hide when aircraft beyond this range

function getModelUri(typeCode, callsign) {
  // Check callsign-based livery override first
  if (callsign) {
    const cs = callsign.toUpperCase();
    for (const [prefix, uri] of Object.entries(LIVERY_MAP)) {
      if (cs.startsWith(prefix)) return uri;
    }
  }
  if (!typeCode) return 'assets/a320.glb';
  const code = typeCode.toUpperCase();
  if (MODEL_MAP[code]) return MODEL_MAP[code];
  // Guess by prefix
  if (code.startsWith('B74')) return 'assets/b744.glb';
  if (code.startsWith('B77')) return 'assets/b772.glb';
  if (code.startsWith('A3') || code.startsWith('B76') || code.startsWith('B78')) return 'assets/a333.glb';
  return 'assets/a320.glb';
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
      // First visit defaults: Kalitta Air + Atlas Air
      watchlist = ['CKS', 'GTI'];
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
  document.getElementById('settingsPanel').classList.remove('visible');
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


// ─── Schedule ───
function loadSchedule() {
  try {
    const saved = localStorage.getItem('skybuddy_schedule');
    if (saved) {
      schedule = JSON.parse(saved);
    } else {
      // Default demo schedule: Kalitta cargo run JFK→PANC→RJAA
      const now = Date.now();
      schedule = [
        { id: 'demo1', flightNumber: 'CKS241', departure: 'KJFK', arrival: 'PANC', dateTime: new Date(now).toISOString(), onboard: true, notes: 'Leg 1: JFK to Anchorage' },
        { id: 'demo2', flightNumber: 'CKS241', departure: 'PANC', arrival: 'RJAA', dateTime: new Date(now + 3600000 * 7).toISOString(), onboard: false, notes: 'Leg 2: Anchorage to Narita' },
      ];
      saveSchedule();
    }
  } catch (e) { schedule = []; }
}
function saveSchedule() {
  try { localStorage.setItem('skybuddy_schedule', JSON.stringify(schedule)); } catch (e) {}
}

// ─── Demo Flight Simulation ───
let demoFlightInterval = null;
let demoProgress = 0;

function startDemoFlight() {
  if (demoFlightInterval) return;
  const onboard = schedule.find(s => s.onboard);
  if (!onboard) return;

  const depApt = AIRPORTS.find(a => a.icao === onboard.departure);
  const arrApt = AIRPORTS.find(a => a.icao === onboard.arrival);
  if (!depApt || !arrApt) return;

  const geodesic = new Cesium.EllipsoidGeodesic(
    Cesium.Cartographic.fromDegrees(depApt.lon, depApt.lat),
    Cesium.Cartographic.fromDegrees(arrApt.lon, arrApt.lat)
  );
  const cruiseAlt = 10668; // FL350 in meters

  // Start 20% into the flight so it's already airborne
  demoProgress = 0.2;
  const demoIcao = 'demo_ac';
  const cs = onboard.flightNumber;

  demoFlightInterval = setInterval(() => {
    demoProgress += 0.002; // ~0.2% per tick
    if (demoProgress >= 0.95) {
      demoProgress = 0.2; // loop back
    }

    const t = demoProgress;
    const pt = geodesic.interpolateUsingFraction(t);
    const lon = Cesium.Math.toDegrees(pt.longitude);
    const lat = Cesium.Math.toDegrees(pt.latitude);

    // Altitude profile
    let alt = cruiseAlt;
    if (t < 0.15) alt = cruiseAlt * (t / 0.15);
    else if (t > 0.85) alt = cruiseAlt * ((1 - t) / 0.15);

    // Heading from current point to next point
    const nextPt = geodesic.interpolateUsingFraction(Math.min(t + 0.01, 1));
    const nextLon = Cesium.Math.toDegrees(nextPt.longitude);
    const nextLat = Cesium.Math.toDegrees(nextPt.latitude);
    const heading = bearingTo(lat, lon, nextLat, nextLon);

    aircraftData[demoIcao] = {
      icao: demoIcao,
      callsign: cs,
      country: 'United States',
      lon, lat,
      alt: alt,
      onGround: false,
      velocity: 250, // ~485 kts
      heading: heading,
      vertRate: t < 0.15 ? 5 : t > 0.85 ? -5 : 0,
      geoAlt: alt,
      acType: 'B744',
      origin: onboard.departure,
      destination: onboard.arrival,
    };

    // Match to schedule
    scheduleMatches.set(onboard.id, demoIcao);
  }, 500);
}

function stopDemoFlight() {
  if (demoFlightInterval) {
    clearInterval(demoFlightInterval);
    demoFlightInterval = null;
    delete aircraftData['demo_ac'];
    if (aircraftEntities['demo_ac']) {
      viewer.entities.remove(aircraftEntities['demo_ac']);
      delete aircraftEntities['demo_ac'];
    }
  }
}

function addScheduleEntry() {
  const flight = document.getElementById('schedFlight').value.trim().toUpperCase();
  const dep = document.getElementById('schedDep').value.trim().toUpperCase();
  const arr = document.getElementById('schedArr').value.trim().toUpperCase();
  const dt = document.getElementById('schedTime').value;
  const onboard = document.getElementById('schedOnboard').checked;
  if (!flight) { notify('Flight number required', 'error'); return; }
  if (!dep || !arr) { notify('Departure and arrival required', 'error'); return; }
  const newId = 'sched_' + Date.now();
  if (onboard) schedule.forEach(s => { s.onboard = false; });
  schedule.push({
    id: newId, flightNumber: flight, departure: dep, arrival: arr,
    dateTime: dt ? new Date(dt).toISOString() : new Date().toISOString(),
    onboard: onboard,
  });
  saveSchedule();
  renderSchedulePanel();
  matchScheduleToLive();
  notify('Added ' + flight + ' to schedule');
  document.getElementById('schedFlight').value = '';
  document.getElementById('schedDep').value = '';
  document.getElementById('schedArr').value = '';
  document.getElementById('schedOnboard').checked = false;
}

function removeScheduleEntry(id) {
  schedule = schedule.filter(s => s.id !== id);
  saveSchedule();
  renderSchedulePanel();
  matchScheduleToLive();
}

function toggleSchedulePanel() {
  document.getElementById('settingsPanel').classList.remove('visible');
  const panel = document.getElementById('schedulePanel');
  panel.classList.toggle('visible');
}

function renderSchedulePanel() {
  const list = document.getElementById('scheduleItems');
  if (!list) return;
  if (schedule.length === 0) {
    list.innerHTML = '<div class="sched-empty">No flights scheduled</div>';
    return;
  }
  list.innerHTML = schedule.map(s => {
    const matchedIcao = scheduleMatches.get(s.id);
    const isLive = !!matchedIcao;
    const dt = new Date(s.dateTime);
    const timeStr = dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    let statusClass = 'scheduled';
    let statusText = 'SCHEDULED';
    if (isLive && s.onboard) { statusClass = 'onboard-live'; statusText = 'ONBOARD'; }
    else if (isLive) { statusClass = 'enroute'; statusText = 'EN ROUTE'; }
    const itemClass = 'sched-item' + (isLive ? ' active' : '') + (s.onboard ? ' onboard' : '');
    const locateBtn = isLive ? '<button class="sched-locate" onclick="locateScheduleFlight(\x27' + s.id + '\x27)">LOCATE</button>' : '';
    return '<div class="' + itemClass + '">' +
      '<div class="sched-flight">' + s.flightNumber + ' ' + locateBtn + '</div>' +
      '<div class="sched-route">' + s.departure + ' <span class="sched-arrow">\u2192</span> ' + s.arrival + '</div>' +
      '<div class="sched-time">' + timeStr + (s.notes ? ' \u00b7 ' + s.notes : '') + '</div>' +
      '<span class="sched-status ' + statusClass + '">' + statusText + '</span>' +
      '<button class="sched-remove" onclick="removeScheduleEntry(\x27' + s.id + '\x27)">\u2715</button>' +
    '</div>';
  }).join('');
}

function locateScheduleFlight(schedId) {
  const icao = scheduleMatches.get(schedId);
  if (icao && aircraftData[icao]) {
    selectAircraft(icao);
    if (window.innerWidth <= 480) document.getElementById('schedulePanel').classList.remove('visible');
  }
}

function matchScheduleToLive() {
  const prevMatches = new Map(scheduleMatches);
  scheduleMatches.clear();

  schedule.forEach(s => {
    const csNorm = s.flightNumber.replace(/\s/g, '').toUpperCase();
    for (const [icao, ac] of Object.entries(aircraftData)) {
      const acCs = (ac.callsign || '').replace(/\s/g, '').toUpperCase();
      if (acCs && (acCs === csNorm || acCs.startsWith(csNorm) || csNorm.startsWith(acCs))) {
        if (!ac.onGround) {
          scheduleMatches.set(s.id, icao);
          break;
        }
      }
    }
  });

  renderSchedulePanel();
  updateFlightBanner();
  updateScheduleRoutes();

  schedule.forEach(s => {
    if (s.onboard && scheduleMatches.has(s.id) && !prevMatches.has(s.id)) {
      const icao = scheduleMatches.get(s.id);
      selectAircraft(icao);
      notify('Your flight ' + s.flightNumber + ' is airborne!');
    }
  });
}

function getOnboardFlight() {
  return schedule.find(s => s.onboard && scheduleMatches.has(s.id)) || null;
}

function updateFlightBanner() {
  const banner = document.getElementById('flightBanner');
  if (!banner) return;
  const onboard = getOnboardFlight();
  if (!onboard) { banner.classList.remove('visible'); return; }

  const icao = scheduleMatches.get(onboard.id);
  const ac = aircraftData[icao];
  if (!ac) { banner.classList.remove('visible'); return; }

  const arrApt = AIRPORTS.find(a => a.icao === onboard.arrival);
  const depApt = AIRPORTS.find(a => a.icao === onboard.departure);

  document.getElementById('fbRoute').textContent = onboard.flightNumber + ' // ' + onboard.departure + ' \u2192 ' + onboard.arrival;
  document.getElementById('fbAlt').textContent = mToFt(ac.alt || ac.geoAlt || 0).toLocaleString();
  document.getElementById('fbSpeed').textContent = msToKts(ac.velocity);

  if (arrApt && ac.lat && ac.lon) {
    const distRemaining = haversineDistance(ac.lat, ac.lon, arrApt.lat, arrApt.lon);
    document.getElementById('fbDist').textContent = Math.round(distRemaining).toLocaleString();
    const speedKmH = (ac.velocity || 0) * 3.6;
    if (speedKmH > 50) {
      const etaHrs = distRemaining / speedKmH;
      const hrs = Math.floor(etaHrs);
      const mins = Math.round((etaHrs - hrs) * 60);
      document.getElementById('fbEta').textContent = (hrs > 0 ? hrs + 'h ' : '') + mins + 'm';
    } else {
      document.getElementById('fbEta').textContent = '--:--';
    }
    if (depApt) {
      const totalDist = haversineDistance(depApt.lat, depApt.lon, arrApt.lat, arrApt.lon);
      const progress = Math.max(0, Math.min(100, ((totalDist - distRemaining) / totalDist) * 100));
      document.getElementById('fbProgress').style.width = progress + '%';
    }
  } else {
    document.getElementById('fbEta').textContent = '--:--';
    document.getElementById('fbDist').textContent = '---';
  }
  banner.classList.add('visible');
}

function updateScheduleRoutes() {
  if (!viewer) return;
  scheduleRouteEntities.forEach(e => viewer.entities.remove(e));
  scheduleRouteEntities = [];

  schedule.forEach((s, idx) => {
    const depApt = AIRPORTS.find(a => a.icao === s.departure);
    const arrApt = AIRPORTS.find(a => a.icao === s.arrival);
    if (!depApt || !arrApt) return;

    const isLive = scheduleMatches.has(s.id);
    const isOnboard = s.onboard && isLive;
    const isPast = new Date(s.dateTime) < Date.now() && !isLive;
    const isFuture = new Date(s.dateTime) > Date.now();

    // Color: onboard=gold, live=green, future=cyan, past=dim
    const color = isOnboard
      ? Cesium.Color.fromCssColorString('#DAA520').withAlpha(0.85)
      : isLive
        ? Cesium.Color.fromCssColorString('#00ff88').withAlpha(0.7)
        : isFuture
          ? Cesium.Color.fromCssColorString('#00b4d8').withAlpha(0.5)
          : Cesium.Color.fromCssColorString('#555555').withAlpha(0.25);

    const width = isOnboard ? 6 : isLive ? 5 : 3;

    // Build a TRUE great-circle arc with altitude using Cesium geodesic
    const cruiseAlt = 10000; // meters (~FL330)
    const steps = 60;
    const positions = [];
    const groundPositions = [];
    const startCart = Cesium.Cartographic.fromDegrees(depApt.lon, depApt.lat);
    const endCart = Cesium.Cartographic.fromDegrees(arrApt.lon, arrApt.lat);
    const geodesic = new Cesium.EllipsoidGeodesic(startCart, endCart);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = geodesic.interpolateUsingFraction(t);
      const lon = Cesium.Math.toDegrees(point.longitude);
      const lat = Cesium.Math.toDegrees(point.latitude);
      // Altitude arc: climb, cruise, descend
      let alt = cruiseAlt;
      if (t < 0.15) alt = cruiseAlt * (t / 0.15);
      else if (t > 0.85) alt = cruiseAlt * ((1 - t) / 0.15);
      positions.push(lon, lat, Math.max(alt, 200));
      groundPositions.push(lon, lat);
    }

    // Main route arc
    const routeEntity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
        width: width,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: isOnboard ? 0.4 : 0.2,
          color: color,
        }),
      },
    });
    scheduleRouteEntities.push(routeEntity);

    // Ground shadow (great circle)
    const groundEntity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray(groundPositions),
        width: 1.5,
        material: color.withAlpha(0.15),
        clampToGround: true,
      },
    });
    scheduleRouteEntities.push(groundEntity);

    // Departure marker — offset left to avoid overlap
    const depMarker = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(depApt.lon, depApt.lat, 200),
      point: { pixelSize: 7, color: Cesium.Color.fromCssColorString('#00ff88'), outlineColor: Cesium.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: {
        text: `${depApt.icao} DEP`,
        font: '9px JetBrains Mono',
        fillColor: Cesium.Color.fromCssColorString('#00ff88'),
        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(-60, -14),
        horizontalOrigin: Cesium.HorizontalOrigin.RIGHT,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.7)'),
        showBackground: true, backgroundPadding: new Cesium.Cartesian2(5, 2),
      },
    });
    scheduleRouteEntities.push(depMarker);

    // Arrival marker — offset right, with ETA
    const depTime = new Date(s.dateTime);
    const dist = haversineDistance(depApt.lat, depApt.lon, arrApt.lat, arrApt.lon);
    const estHours = dist / 850;
    const timeToLanding = Math.max(0, new Date(depTime.getTime() + estHours * 3600000).getTime() - Date.now());
    const hoursLeft = Math.floor(timeToLanding / 3600000);
    const minsLeft = Math.floor((timeToLanding % 3600000) / 60000);
    const etaCountdown = timeToLanding > 0 ? `${hoursLeft}h${minsLeft}m` : 'ARRIVED';

    const arrMarker = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(arrApt.lon, arrApt.lat, 200),
      point: { pixelSize: 7, color: Cesium.Color.fromCssColorString('#DAA520'), outlineColor: Cesium.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: {
        text: `${arrApt.icao} ARR  ${etaCountdown}`,
        font: '9px JetBrains Mono',
        fillColor: Cesium.Color.fromCssColorString('#DAA520'),
        outlineColor: Cesium.Color.BLACK, outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(12, -14),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.7)'),
        showBackground: true, backgroundPadding: new Cesium.Cartesian2(5, 2),
      },
    });
    scheduleRouteEntities.push(arrMarker);
  });
}

function isScheduledAircraft(icao) {
  for (const [, matchedIcao] of scheduleMatches) {
    if (matchedIcao === icao) return true;
  }
  return false;
}

function isOnboardAircraft(icao) {
  for (let i = 0; i < schedule.length; i++) {
    if (schedule[i].onboard && scheduleMatches.get(schedule[i].id) === icao) return true;
  }
  return false;
}

// ─── Initialization ───
function initApp() {
  const token = document.getElementById('cesiumToken').value.trim();
  if (!token) {
    toggleSettingsPanel();
    notify('Set your Cesium Ion token in Settings', 'error');
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

    // Visual quality — scaled for device
    const mobile = isMobile();
    viewer.scene.globe.enableLighting = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0002;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.highDynamicRange = !mobile;
    viewer.scene.globe.maximumScreenSpaceError = mobile ? 4 : 1.5;
    viewer.scene.fxaa = !mobile;
    viewer.scene.postProcessStages.ambientOcclusion.enabled = false;
    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.skyAtmosphere.brightnessShift = 0.02;
    viewer.scene.skyAtmosphere.saturationShift = 0.1;

    // Fluid camera movement — Google Earth style
    const ssc = viewer.scene.screenSpaceCameraController;
    ssc.enableCollisionDetection = false; // don't stick to terrain
    ssc.minimumZoomDistance = 100;        // allow close zoom
    ssc.maximumZoomDistance = 50000000;   // zoom out to see full globe
    ssc.inertiaZoom = 0.7;               // smooth zoom momentum
    ssc.inertiaSpin = 0.9;               // smooth pan/spin momentum
    ssc.inertiaTranslate = 0.9;          // smooth translate momentum
    ssc.tiltEventTypes = [Cesium.CameraEventType.RIGHT_DRAG, Cesium.CameraEventType.PINCH,
      { eventType: Cesium.CameraEventType.LEFT_DRAG, modifier: Cesium.KeyboardEventModifier.CTRL }];
    ssc.zoomEventTypes = [Cesium.CameraEventType.MIDDLE_DRAG, Cesium.CameraEventType.WHEEL, Cesium.CameraEventType.PINCH];
    if (mobile) {
      viewer.resolutionScale = 0.75; // render at 75% for mobile perf
      viewer.scene.requestRenderMode = true;
      viewer.scene.maximumRenderTimeChange = 0.5;
    }

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

    // On mobile, start with side panel hidden for full 3D view
    if (isMobile()) {
      document.getElementById('sidePanel').classList.add('hidden');
      document.getElementById('toggleBtn').style.display = 'block';
    }

    fetchAircraft().then(() => {
      const overlay = document.getElementById('loadingOverlay');
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.style.display = 'none', 600);
      notify('SKYBUDDY online — tracking live aircraft');
      // Start demo flight if schedule has an onboard flight with no live match
      if (schedule.find(s => s.onboard) && scheduleMatches.size === 0) {
        startDemoFlight();
      }
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
  loadSchedule();
  renderSchedulePanel();

  // Auto-launch if we have a token
  if (token) {
    initApp();
  } else {
    // No token — show settings panel
    toggleSettingsPanel();
    notify('Set your Cesium Ion token in Settings to begin', 'error');
  }
}

// ─── Settings Panel ───
function toggleSettingsPanel() {
  document.getElementById('watchlistPanel').classList.remove('visible');
  document.getElementById('schedulePanel').classList.remove('visible');
  const panel = document.getElementById('settingsPanel');
  panel.classList.toggle('visible');
  if (panel.classList.contains('visible')) {
    const creds = loadCredentials();
    document.getElementById('settingsCesiumToken').value = creds.token || (window.ENV && window.ENV.CESIUM_ION_TOKEN) || '';
    document.getElementById('settingsOsUser').value = creds.user || '';
    document.getElementById('settingsOsPass').value = creds.pass || '';
  }
}

function saveSettings() {
  const token = document.getElementById('settingsCesiumToken').value.trim();
  const user = document.getElementById('settingsOsUser').value.trim();
  const pass = document.getElementById('settingsOsPass').value.trim();
  if (!token) {
    notify('Cesium token is required', 'error');
    return;
  }
  saveCredentials(token, user, pass);
  notify('Settings saved — reloading...');
  setTimeout(() => location.reload(), 500);
}

// ─── Keyboard Shortcuts ───
function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT') return;
  const key = e.key;
  if (key === 'R') { cycleRouteMode(); return; }
  switch (e.key.toLowerCase()) {
    case 'l': toggleLabels(); break;
    case 't': togglePaths(); break;
    case 'h': flyHome(); break;
    case 'r': refreshData(); break;
    case 'p': togglePrediction(); break;
    case 'a': toggleAirports(); break;
    case 'f': toggleAltFilter(); break;
    case 'w': toggleWatchlistPanel(); break;
    case 's': toggleSchedulePanel(); break;
    case 'c': toggleConflicts(); break;
    case 'g': if (selectedAc) toggleGpsMode(); break;
    case 'escape':
      if (selectedAc) closeDetail();
      break;
  }
}

// ─── Data Sources ───
function buildOpenSkyUrl(rect) {
  let url = '/api/opensky/api/states/all';
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
  if (!rect) return '/api/adsb/v2/ladd';
  const west = Cesium.Math.toDegrees(rect.west).toFixed(2);
  const south = Cesium.Math.toDegrees(rect.south).toFixed(2);
  const east = Cesium.Math.toDegrees(rect.east).toFixed(2);
  const north = Cesium.Math.toDegrees(rect.north).toFixed(2);
  if ((north - south) < CONFIG.ZOOM_BOUNDING_LAT) {
    return `/api/adsb/v2/lat/${((+north + +south) / 2).toFixed(4)}/lon/${((+east + +west) / 2).toFixed(4)}/dist/250`;
  }
  return '/api/adsb/v2/ladd';
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
  // When watchlist is active, use wide-radius search to find all watched aircraft worldwide
  if (watchlistActive && watchlist.length > 0) {
    try {
      // Search from multiple points to get global coverage
      const searchPoints = [
        { lat: 42.23, lon: -83.53 },  // KYIP (Kalitta HQ / North America)
        { lat: 51.47, lon: -0.45 },   // EGLL (Europe)
        { lat: 25.25, lon: 55.37 },   // OMDB (Middle East / Asia)
      ];
      const allResults = {};
      const fetches = searchPoints.map(async (pt) => {
        try {
          const resp = await fetch(`/api/adsb/v2/lat/${pt.lat}/lon/${pt.lon}/dist/5000`);
          if (!resp.ok) return;
          const data = await resp.json();
          const parsed = parseAdsbLolData(data);
          // Only keep aircraft that pass watchlist
          Object.entries(parsed).forEach(([icao, ac]) => {
            if (passesWatchlist(ac)) allResults[icao] = ac;
          });
        } catch (e) { console.warn('Watchlist search failed for point', pt, e); }
      });
      await Promise.all(fetches);

      document.getElementById('pulseDot').style.background = Object.keys(allResults).length > 0 ? 'var(--accent)' : 'var(--warn)';
      const now = new Date();
      document.getElementById('lastUpdate').textContent = now.toTimeString().split(' ')[0];
      document.getElementById('acCount').textContent = Object.keys(allResults).length;
      document.getElementById('dataSource').textContent = 'ADSB.LOL';
      stats.totalTracked = Math.max(stats.totalTracked, Object.keys(allResults).length);
      aircraftData = allResults;
      updateGlobe();
      renderAircraftList();
      matchScheduleToLive();
      prefetchRoutes();
      if (selectedAc && aircraftData[selectedAc]) {
        updateDetailPanel(aircraftData[selectedAc]);
        if (showRoutes) drawAllRoutes();
        checkWebcamProximity(aircraftData[selectedAc]);
      }
      if (Object.keys(allResults).length === 0) {
        notify('No watched aircraft airborne right now');
      }
      return;
    } catch (e) {
      console.warn('Watchlist global search failed, falling back', e);
    }
  }

  const rect = viewer.camera.computeViewRectangle();
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
      matchScheduleToLive();
      prefetchRoutes();

      if (selectedAc && aircraftData[selectedAc]) {
        updateDetailPanel(aircraftData[selectedAc]);
        if (showRoutes) drawAllRoutes();
        checkWebcamProximity(aircraftData[selectedAc]);
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

// ─── Label Builder ───
function buildLabelText(ac) {
  const cs = ac.callsign || ac.icao;
  const type = ac.acType ? `[${ac.acType}]` : '';
  const altStr = ac.alt ? `FL${Math.round(mToFt(ac.alt) / 100)}` : '';

  // Use cached route data if available, else estimate
  const csKey = (ac.callsign || '').trim().toUpperCase();
  const cached = routeCache[csKey];
  let origin = ac.origin || '';
  let dest = ac.destination || '';

  if (cached && cached._airports && cached._airports.length >= 2) {
    origin = cached._airports[0].icao;
    dest = cached._airports[cached._airports.length - 1].icao;
  } else if (!origin || !dest) {
    if (!origin) origin = findNearestBehind(ac);
    if (!dest) {
      const estDest = estimateDestination(ac);
      dest = estDest.airport ? estDest.airport.icao : '';
    }
  }

  const routeStr = (origin && dest) ? `${origin}→${dest}` :
                   dest ? `→${dest}` :
                   origin ? `${origin}→` : '';
  const line1 = [cs, type].filter(Boolean).join(' ');
  const line2 = [altStr, routeStr].filter(Boolean).join('  ');
  return line2 ? `${line1}\n${line2}` : line1;
}

// Async route prefetch for labels — call after data fetch
async function prefetchRoutes() {
  const aircraft = Object.values(aircraftData).filter(ac => ac.callsign);
  for (const ac of aircraft) {
    const cs = ac.callsign.trim().toUpperCase();
    if (routeCache[cs] === undefined) {
      fetchFlightRoute(cs); // fire and forget, updates cache
    }
  }
}

function findNearestBehind(ac) {
  if (!ac.lat || !ac.lon || !ac.heading) return '';
  const reverseHdg = (ac.heading + 180) % 360;
  let best = null, bestScore = Infinity;
  for (const apt of AIRPORTS) {
    const dist = haversineDistance(ac.lat, ac.lon, apt.lat, apt.lon);
    if (dist < 10 || dist > 2000) continue;
    const bearing = bearingTo(ac.lat, ac.lon, apt.lat, apt.lon);
    let angleDiff = Math.abs(bearing - reverseHdg);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;
    if (angleDiff > 40) continue;
    const score = dist * (1 + angleDiff / 20);
    if (score < bestScore) { bestScore = score; best = apt; }
  }
  return best ? best.icao : '';
}

// ─── Flight Route System ───
let routeEntities = [];

// Fetch actual flight plan from VRS standing data
async function fetchFlightRoute(callsign) {
  if (!callsign) return null;
  const cs = callsign.trim().toUpperCase();
  if (routeCache[cs] !== undefined) return routeCache[cs];

  try {
    const prefix = cs.slice(0, 2);
    const resp = await fetch(`https://vrs-standing-data.adsb.lol/routes/${prefix}/${cs}.json`);
    if (!resp.ok) {
      routeCache[cs] = null;
      return null;
    }
    const data = await resp.json();
    routeCache[cs] = data;
    return data;
  } catch (e) {
    routeCache[cs] = null;
    return null;
  }
}

// Draw route for a single aircraft
async function drawRouteForAircraft(ac, color) {
  if (!ac || !ac.lat || !ac.lon || ac.onGround) return;

  const alt = ac.alt || ac.geoAlt || 10000;
  const cs = (ac.callsign || '').trim();
  const route = await fetchFlightRoute(cs);

  let waypoints = [];

  if (route && route._airports && route._airports.length >= 2) {
    // Real flight plan route
    waypoints = route._airports.map(a => ({ lat: a.lat, lon: a.lon, icao: a.icao, name: a.name }));
    // Store origin/destination on the aircraft data for labels
    ac.origin = waypoints[0].icao;
    ac.destination = waypoints[waypoints.length - 1].icao;
  } else {
    // Fallback: estimate origin + destination
    const origin = findNearestBehind(ac);
    const dest = estimateDestination(ac);
    if (!dest.airport && !origin) return;

    if (origin) {
      const apt = AIRPORTS.find(a => a.icao === origin);
      if (apt) waypoints.push({ lat: apt.lat, lon: apt.lon, icao: apt.icao, name: apt.name });
    }
    // Current position as midpoint
    waypoints.push({ lat: ac.lat, lon: ac.lon, icao: null, name: null });
    if (dest.airport) {
      waypoints.push({ lat: dest.airport.lat, lon: dest.airport.lon, icao: dest.airport.icao, name: dest.airport.name });
    }
  }

  if (waypoints.length < 2) return;

  const lineColor = color || 'rgba(218,165,32,0.7)';
  const shadowColor = color ? color.replace(/[\d.]+\)$/, '0.15)') : 'rgba(218,165,32,0.15)';

  // Build TRUE great-circle segments between each waypoint pair
  for (let w = 0; w < waypoints.length - 1; w++) {
    const from = waypoints[w];
    const to = waypoints[w + 1];
    const segDist = haversineDistance(from.lat, from.lon, to.lat, to.lon);
    const steps = Math.max(20, Math.min(80, Math.round(segDist / 50)));
    const positions = [];
    const groundPositions = [];
    const startCart = Cesium.Cartographic.fromDegrees(from.lon, from.lat);
    const endCart = Cesium.Cartographic.fromDegrees(to.lon, to.lat);
    const geodesic = new Cesium.EllipsoidGeodesic(startCart, endCart);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = geodesic.interpolateUsingFraction(t);
      const interpLon = Cesium.Math.toDegrees(point.longitude);
      const interpLat = Cesium.Math.toDegrees(point.latitude);

      // Altitude profile: climb from origin, cruise, descend to destination
      let segAlt = alt;
      if (w === 0 && waypoints[0].icao) {
        segAlt = t < 0.2 ? alt * (t / 0.2) : alt;
      }
      if (w === waypoints.length - 2 && waypoints[waypoints.length - 1].icao) {
        segAlt = t > 0.7 ? alt * (1 - ((t - 0.7) / 0.3)) : alt;
      }
      positions.push(interpLon, interpLat, Math.max(segAlt, 100));
      groundPositions.push(interpLon, interpLat, 50);
    }

    // Route arc
    const routeLine = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
        width: 5,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.25,
          color: Cesium.Color.fromCssColorString(lineColor),
        }),
      },
    });
    routeEntities.push(routeLine);

    // Ground shadow
    const groundLine = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(groundPositions),
        width: 1.5,
        material: Cesium.Color.fromCssColorString(shadowColor),
        clampToGround: true,
      },
    });
    routeEntities.push(groundLine);
  }

  // Airport markers for each waypoint
  waypoints.forEach((wp, idx) => {
    if (!wp.icao) return;
    const isOrigin = idx === 0;
    const isDest = idx === waypoints.length - 1;
    const markerColor = isOrigin ? '#00ff88' : isDest ? '#DAA520' : '#00b4d8';
    const label = isOrigin ? 'ORIGIN' : isDest ? 'DEST' : 'STOP';

    const marker = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, 100),
      point: {
        pixelSize: isDest || isOrigin ? 8 : 6,
        color: Cesium.Color.fromCssColorString(markerColor),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: `${wp.icao} ${label}`,
        font: '10px JetBrains Mono',
        fillColor: Cesium.Color.fromCssColorString(markerColor),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.7)'),
        showBackground: true,
        backgroundPadding: new Cesium.Cartesian2(6, 3),
      },
    });
    routeEntities.push(marker);
  });
}

// Route is shown automatically when a plane is clicked (selected)
// Schedule routes are always shown via updateScheduleRoutes()

function drawRouteProjection(ac) {
  // No-op — routes drawn on select
}

function clearRouteProjection() {
  routeEntities.forEach(e => viewer.entities.remove(e));
  routeEntities = [];
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

    // Filter: hide entities that don't pass watchlist, altitude, search, or conflict filter
    if (!passesWatchlist(ac) || !passesAltFilter(ac) || !passesGlobeFilter(ac) || !passesConflictFilter(ac)) {
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
      new Cesium.HeadingPitchRoll(hdgRad + MODEL_HEADING_OFFSET, pitchRad, 0)
    );

    const modelUri = getModelUri(ac.acType, ac.callsign);

    if (aircraftEntities[ac.icao]) {
      const entity = aircraftEntities[ac.icao];
      entity.position = position;
      entity.orientation = orientation;

      // Switch model if type changed (e.g. first fetch had no type, update has it)
      if (entity._modelUri !== modelUri) {
        entity.model.uri = modelUri;
        entity._modelUri = modelUri;
      }

      // Schedule visual effects
      if (isOnboardAircraft(ac.icao)) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
        entity.model.silhouetteColor = Cesium.Color.fromCssColorString('#DAA520').withAlpha(0.4 + pulse * 0.6);
        entity.model.silhouetteSize = isMobile() ? 2.0 : 3.0;
      } else if (isScheduledAircraft(ac.icao)) {
        entity.model.silhouetteColor = Cesium.Color.fromCssColorString('#00ff88').withAlpha(0.6);
        entity.model.silhouetteSize = isMobile() ? 1.5 : 2.0;
      } else {
        entity.model.silhouetteColor = Cesium.Color.fromCssColorString('#00ff88').withAlpha(0.3);
        entity.model.silhouetteSize = isMobile() ? 0.5 : 1.0;
      }

      if (entity.label) {
        entity.label.show = showLabels && !!ac.callsign;
        entity.label.text = buildLabelText(ac);
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
          minimumPixelSize: isMobile() ? 64 : 80,
          maximumScale: isMobile() ? 500 : 800,
          scale: 1.0,
          silhouetteColor: isOnboardAircraft(ac.icao) ? Cesium.Color.fromCssColorString('#DAA520').withAlpha(0.8) : isScheduledAircraft(ac.icao) ? Cesium.Color.fromCssColorString('#00ff88').withAlpha(0.6) : Cesium.Color.fromCssColorString('#00ff88').withAlpha(0.3),
          silhouetteSize: isOnboardAircraft(ac.icao) ? (isMobile() ? 2.0 : 3.0) : isScheduledAircraft(ac.icao) ? (isMobile() ? 1.5 : 2.0) : (isMobile() ? 0.5 : 1.0),
        },
        label: {
          text: buildLabelText(ac),
          font: '13px JetBrains Mono',
          fillColor: isOnboardAircraft(ac.icao) ? Cesium.Color.fromCssColorString('#FFD700') : isScheduledAircraft(ac.icao) ? Cesium.Color.fromCssColorString('#00ff88') : Cesium.Color.fromCssColorString('#e0e8f0'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -60),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          scaleByDistance: new Cesium.NearFarScalar(5e3, 1.2, 2e7, 0.6),
          translucencyByDistance: new Cesium.NearFarScalar(1e3, 1.0, 5e7, 0.7),
          show: showLabels && !!ac.callsign,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.75)'),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(8, 5),
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
  if (trackingAc && !orbitMode && aircraftData[trackingAc]) {
    const ac = aircraftData[trackingAc];
    const alt = ac.alt || ac.geoAlt || 5000;
    const hdg = ac.heading || 0;

    if (gpsMode) {
      // GPS mode — top-down, north-up, centered on aircraft
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(ac.lon, ac.lat, alt + 2000),
        orientation: {
          heading: 0, // north-up
          pitch: Cesium.Math.toRadians(-90), // straight down
          roll: 0,
        },
        duration: CONFIG.TRACK_FLY_DURATION,
      });
    } else {
      // Chase cam — behind aircraft looking forward
      const hdgRad = Cesium.Math.toRadians(hdg);
      const offsetDist = 0.003;
      const camLat = ac.lat - Math.cos(hdgRad) * offsetDist;
      const camLon = ac.lon - Math.sin(hdgRad) * offsetDist;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(camLon, camLat, alt + 150),
        orientation: {
          heading: Cesium.Math.toRadians(hdg),
          pitch: Cesium.Math.toRadians(-10),
          roll: 0,
        },
        duration: CONFIG.TRACK_FLY_DURATION,
      });
    }
  }

  // Keep orbit entity synced
  if (orbitMode && trackingAc && aircraftEntities[trackingAc]) {
    viewer.trackedEntity = aircraftEntities[trackingAc];
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
    .filter(ac => ac.lat && ac.lon && (watchlistActive ? true : !ac.onGround) && passesWatchlist(ac) && passesAltFilter(ac) && passesConflictFilter(ac))
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
  const dp = document.getElementById('detailPanel');
  dp.classList.remove('minimized');
  dp.classList.add('visible');
  checkWebcamProximity(ac);

  const btn = document.getElementById('btnTrack');
  btn.textContent = trackingAc === icao ? '■ STOP TRACKING' : '◎ TRACK AIRCRAFT';
  btn.classList.toggle('tracking', trackingAc === icao);

  // Fly to aircraft — side view (perpendicular to heading, slightly above)
  const alt = ac.alt || ac.geoAlt || 5000;
  const hdg = ac.heading || 0;
  const hdgRad = Cesium.Math.toRadians(hdg);
  // Position camera to the RIGHT side, perpendicular to heading
  const sideAngle = hdgRad + Math.PI / 2; // 90° to the right
  const offsetDist = 0.005;
  const camLat = ac.lat + Math.cos(sideAngle) * offsetDist;
  const camLon = ac.lon + Math.sin(sideAngle) * offsetDist;
  // Camera looks toward the aircraft (heading back toward plane = sideAngle + 180°)
  const lookHdg = (hdg + 270) % 360; // look left toward the plane

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(camLon, camLat, alt + 80),
    orientation: {
      heading: Cesium.Math.toRadians(lookHdg),
      pitch: Cesium.Math.toRadians(-5),
      roll: 0,
    },
    duration: CONFIG.FLY_DURATION,
  });

  // Draw route for selected aircraft
  clearRouteProjection();
  drawRouteForAircraft(ac);

  // On mobile, close side panel so 3D view is visible
  if (isMobile()) {
    const panel = document.getElementById('sidePanel');
    const btn = document.getElementById('toggleBtn');
    panel.classList.add('hidden');
    btn.style.display = 'block';
  }

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

  // ETA estimation
  const dest = estimateDestination(ac);
  if (dest.airport) {
    document.getElementById('detDest').textContent = `${dest.airport.icao} — ${dest.airport.name}`;
    document.getElementById('detEta').textContent = formatEta(dest.etaMin);
    document.getElementById('detDist').textContent = `${dest.distKm.toLocaleString()} km / ${Math.round(dest.distKm * 0.539957).toLocaleString()} nm`;
  } else {
    document.getElementById('detDest').textContent = ac.onGround ? 'On ground' : 'Calculating...';
    document.getElementById('detEta').textContent = '—';
    document.getElementById('detDist').textContent = '—';
  }
}

function toggleDetailMinimize() {
  document.getElementById('detailPanel').classList.toggle('minimized');
}

function closeDetail() {
  const dp = document.getElementById('detailPanel');
  dp.classList.remove('visible');
  dp.classList.remove('minimized');
  selectedAc = null;
  trackingAc = null;
  orbitMode = false;
  gpsMode = false;
  viewer.trackedEntity = undefined;
  clearRouteProjection();
  hideWebcamPip();
  renderAircraftList();
}

// ─── Zoom to Aircraft ───
function zoomToAircraft() {
  if (!selectedAc || !aircraftData[selectedAc]) return;
  const ac = aircraftData[selectedAc];
  const alt = ac.alt || ac.geoAlt || 1000;
  const hdg = ac.heading || 0;
  const hdgRad = Cesium.Math.toRadians(hdg);

  // Side view — camera offset to the right of the aircraft, slightly behind and above
  const sideAngle = hdgRad + Math.PI / 2; // perpendicular to heading (right side)
  const behindAngle = hdgRad + Math.PI;    // behind the aircraft
  const sideDist = 0.004;  // further out for wider view
  const behindDist = 0.001; // slightly behind
  const camLat = ac.lat + Math.cos(sideAngle) * sideDist + Math.cos(behindAngle) * behindDist;
  const camLon = ac.lon + Math.sin(sideAngle) * sideDist + Math.sin(behindAngle) * behindDist;
  const lookHdg = (hdg + 270) % 360; // look left toward the plane

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(camLon, camLat, alt + 80),
    orientation: {
      heading: Cesium.Math.toRadians(lookHdg),
      pitch: Cesium.Math.toRadians(-5),
      roll: 0,
    },
    duration: 1.2,
  });
}

// ─── Destination & ETA Estimation ───
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = Cesium.Math.toRadians(lat2 - lat1);
  const dLon = Cesium.Math.toRadians(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(Cesium.Math.toRadians(lat1)) * Math.cos(Cesium.Math.toRadians(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function bearingTo(lat1, lon1, lat2, lon2) {
  const dLon = Cesium.Math.toRadians(lon2 - lon1);
  const rlat1 = Cesium.Math.toRadians(lat1);
  const rlat2 = Cesium.Math.toRadians(lat2);
  const y = Math.sin(dLon) * Math.cos(rlat2);
  const x = Math.cos(rlat1) * Math.sin(rlat2) - Math.sin(rlat1) * Math.cos(rlat2) * Math.cos(dLon);
  return (Cesium.Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function estimateDestination(ac) {
  if (!ac.lat || !ac.lon || !ac.heading || !ac.velocity || ac.onGround) {
    return { airport: null, distKm: 0, etaMin: 0 };
  }

  const hdg = ac.heading;
  const speedKmh = (ac.velocity || 0) * 3.6; // m/s to km/h
  let bestAirport = null;
  let bestScore = Infinity;

  for (const apt of AIRPORTS) {
    const dist = haversineDistance(ac.lat, ac.lon, apt.lat, apt.lon);
    if (dist < 20) continue; // skip airports we're already over

    const bearing = bearingTo(ac.lat, ac.lon, apt.lat, apt.lon);
    let angleDiff = Math.abs(bearing - hdg);
    if (angleDiff > 180) angleDiff = 360 - angleDiff;

    // Only consider airports roughly ahead (within 30°)
    if (angleDiff > 30) continue;

    // Score: prefer closer airports that are more directly ahead
    const score = dist * (1 + angleDiff / 15);
    if (score < bestScore) {
      bestScore = score;
      bestAirport = apt;
    }
  }

  if (!bestAirport || speedKmh < 50) {
    return { airport: null, distKm: 0, etaMin: 0 };
  }

  const distKm = haversineDistance(ac.lat, ac.lon, bestAirport.lat, bestAirport.lon);
  const etaMin = Math.round((distKm / speedKmh) * 60);

  return { airport: bestAirport, distKm: Math.round(distKm), etaMin };
}

function formatEta(minutes) {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

// ─── Tracking ───
function toggleTracking() {
  if (trackingAc === selectedAc) {
    trackingAc = null;
    orbitMode = false;
    gpsMode = false;
    viewer.trackedEntity = undefined;
  } else {
    trackingAc = selectedAc;
    orbitMode = false;
    gpsMode = false;
    viewer.trackedEntity = undefined;
  }
  updateTrackingUI();
  if (trackingAc) notify('Tracking ' + (aircraftData[trackingAc]?.callsign || trackingAc));
}

function toggleOrbitMode() {
  if (!selectedAc) return;

  if (orbitMode) {
    orbitMode = false;
    trackingAc = null;
    viewer.trackedEntity = undefined;
    notify('Orbit off');
  } else {
    orbitMode = true;
    gpsMode = false;
    trackingAc = selectedAc;
    const entity = aircraftEntities[selectedAc];
    if (entity) {
      viewer.trackedEntity = entity;
      viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.8);
      notify('ORBIT — drag to rotate freely, scroll to zoom');
    }
  }
  updateTrackingUI();
}

function toggleGpsMode() {
  if (!selectedAc) return;

  if (gpsMode) {
    gpsMode = false;
    trackingAc = null;
    viewer.trackedEntity = undefined;
    notify('GPS tracking off');
  } else {
    gpsMode = true;
    orbitMode = false;
    trackingAc = selectedAc;
    viewer.trackedEntity = undefined;
    notify('GPS MODE — top-down north-up tracking');
  }
  updateTrackingUI();
}

function updateTrackingUI() {
  const btn = document.getElementById('btnTrack');
  btn.textContent = trackingAc && !orbitMode && !gpsMode ? '■ STOP' : '◎ CHASE';
  btn.classList.toggle('tracking', !!trackingAc && !orbitMode && !gpsMode);
  const orbitBtn = document.getElementById('btnOrbit');
  if (orbitBtn) {
    orbitBtn.classList.toggle('tracking', orbitMode);
    orbitBtn.textContent = orbitMode ? '■ EXIT ORBIT' : '⟳ ORBIT';
  }
  const gpsBtn = document.getElementById('btnGps');
  if (gpsBtn) {
    gpsBtn.classList.toggle('tracking', gpsMode);
    gpsBtn.textContent = gpsMode ? '■ EXIT GPS' : '◎ GPS';
  }
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

function isMobile() {
  return window.innerWidth <= 480;
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
    entity._airportData = apt;
    airportEntities.push(entity);
  });

  // Click/tap handler for airport names
  if (!drawAirports._handlerAdded && viewer) {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(function (click) {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id._airportData) {
        const apt = picked.id._airportData;
        // Toggle between ICAO code and full name
        const label = picked.id.label;
        if (label) {
          const current = label.text.getValue();
          label.text = current.includes('\n') ? apt.icao : `${apt.icao}\n${apt.name}`;
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Hover handler (desktop) — show name on mouse over
    handler.setInputAction(function (movement) {
      const picked = viewer.scene.pick(movement.endPosition);
      // Reset all airport labels to ICAO only
      airportEntities.forEach(e => {
        if (e._airportData && e.label) {
          const txt = e.label.text.getValue();
          if (txt.includes('\n') && !e._airportClicked) {
            e.label.text = e._airportData.icao;
          }
        }
      });
      // Show hovered airport name
      if (Cesium.defined(picked) && picked.id && picked.id._airportData) {
        const apt = picked.id._airportData;
        picked.id.label.text = `${apt.icao}\n${apt.name}`;
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    drawAirports._handlerAdded = true;
  }
}

// ─── Conflict Zone Overlay ───
function toggleConflicts() {
  showConflicts = !showConflicts;
  document.getElementById('btnConflicts').classList.toggle('active', showConflicts);
  document.getElementById('conflictLegend').style.display = showConflicts ? 'block' : 'none';
  // Auto-enable war filter when conflicts are shown
  conflictFilterActive = showConflicts;
  if (showConflicts) {
    drawConflicts();
    // Rebuild globe with conflict filter active
    Object.keys(aircraftEntities).forEach(icao => {
      viewer.entities.remove(aircraftEntities[icao]);
      delete aircraftEntities[icao];
    });
    updateGlobe();
    renderAircraftList();
  } else {
    clearConflicts();
    // Rebuild globe without conflict filter
    Object.keys(aircraftEntities).forEach(icao => {
      viewer.entities.remove(aircraftEntities[icao]);
      delete aircraftEntities[icao];
    });
    updateGlobe();
    renderAircraftList();
  }
  notify('Conflict zones ' + (showConflicts ? 'ON — war filter active' : 'OFF'));
}

function toggleConflictFilter() {
  conflictFilterActive = !conflictFilterActive;
  document.getElementById('btnConflictFilter').classList.toggle('active', conflictFilterActive);
  // Rebuild globe with filter
  Object.keys(aircraftEntities).forEach(icao => {
    viewer.entities.remove(aircraftEntities[icao]);
    delete aircraftEntities[icao];
  });
  updateGlobe();
  renderAircraftList();
  notify('Conflict filter ' + (conflictFilterActive ? 'ON — showing only conflict-zone aircraft' : 'OFF'));
}

function passesConflictFilter(ac) {
  if (!conflictFilterActive) return true;
  return isConflictCountry(ac.country);
}

let conflictLabelEntities = []; // separate label entities for conflict/country names
let conflictHoverHandler = null;
let _hoveredCountryEntity = null; // track currently hovered country for label toggle

async function drawConflicts() {
  clearConflicts();
  try {
    const geojsonUrl = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';
    const conflictNames = new Set(CONFLICT_COUNTRIES.map(c => c.name));

    conflictDataSource = new Cesium.GeoJsonDataSource('conflicts');
    await conflictDataSource.load(geojsonUrl, {
      stroke: Cesium.Color.TRANSPARENT,
      fill: Cesium.Color.TRANSPARENT,
      strokeWidth: 0,
    });

    const entities = conflictDataSource.entities.values.slice();
    for (const entity of entities) {
      const name = entity.properties && entity.properties.name ?
        entity.properties.name.getValue() : '';
      const conflict = CONFLICT_COUNTRIES.find(c => c.name === name);

      // Tag every entity with its country name for hover/click
      entity._countryName = name;
      entity._isConflict = !!conflict;

      if (conflict && entity.polygon) {
        // Conflict country — red overlay with severity-based alpha
        const alpha = conflict.severity === 'war' ? 0.25 :
                      conflict.severity === 'high' ? 0.18 : 0.12;
        entity.polygon.material = Cesium.Color.RED.withAlpha(alpha);
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.RED.withAlpha(0.5);
        entity.polygon.height = 0;
        entity._conflictSeverity = conflict.severity;
      } else if (entity.polygon) {
        // Non-conflict country — invisible fill, no outline (clickable for name)
        entity.polygon.material = Cesium.Color.TRANSPARENT;
        entity.polygon.outline = false;
        entity.polygon.height = 0;
      }
    }

    // Add conflict country center labels — always visible
    CONFLICT_COUNTRIES.forEach(c => {
      const severityTag = c.severity === 'war' ? 'WAR' :
                          c.severity === 'high' ? 'HIGH' : 'MED';
      const sevColor = c.severity === 'war' ? 'rgba(255, 50, 50, 0.95)' :
                       c.severity === 'high' ? 'rgba(255, 140, 50, 0.95)' : 'rgba(255, 200, 80, 0.9)';
      const labelEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(c.lon, c.lat, 500),
        label: {
          text: `${c.name.toUpperCase()}  ${severityTag}`,
          font: '11px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString(sevColor),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, 0),
          scaleByDistance: new Cesium.NearFarScalar(1e5, 1.2, 1.5e7, 0.35),
          translucencyByDistance: new Cesium.NearFarScalar(1e5, 1.0, 2e7, 0.3),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          show: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.6)'),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(6, 3),
        },
        _conflictLabel: true,
        _countryName: c.name,
      });
      conflictLabelEntities.push(labelEntity);
    });

    viewer.dataSources.add(conflictDataSource);

    // Hover + click handler for country names
    if (!conflictHoverHandler) {
      conflictHoverHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

      // Hover — show label for country under cursor
      conflictHoverHandler.setInputAction(function (movement) {
        // Hide previous hover label
        if (_hoveredCountryEntity && !_hoveredCountryEntity._clicked) {
          _hoveredCountryEntity.label.show = false;
          _hoveredCountryEntity = null;
        }

        const picked = viewer.scene.pick(movement.endPosition);
        if (!Cesium.defined(picked) || !picked.id) return;

        const entity = picked.id;
        const countryName = entity._countryName;
        if (!countryName) return;

        // Find or create a label for this country
        let labelEnt = conflictLabelEntities.find(e => e._countryName === countryName);
        if (!labelEnt) {
          // Non-conflict country — create a temporary label at pick position
          const cartesian = viewer.scene.pickPosition(movement.endPosition);
          if (!cartesian) return;
          const carto = Cesium.Cartographic.fromCartesian(cartesian);
          labelEnt = viewer.entities.add({
            position: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 500),
            label: {
              text: countryName.toUpperCase(),
              font: '11px JetBrains Mono',
              fillColor: Cesium.Color.fromCssColorString('rgba(200, 214, 229, 0.9)'),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -18),
              scaleByDistance: new Cesium.NearFarScalar(1e5, 1.0, 1.5e7, 0.4),
              translucencyByDistance: new Cesium.NearFarScalar(1e5, 1.0, 2e7, 0.0),
              disableDepthTestDistance: 0,
              show: false,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            _conflictLabel: true,
            _countryName: countryName,
            _temporary: true,
          });
          conflictLabelEntities.push(labelEnt);
        }

        labelEnt.label.show = true;
        _hoveredCountryEntity = labelEnt;
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      // Click — toggle sticky label
      conflictHoverHandler.setInputAction(function (click) {
        const picked = viewer.scene.pick(click.position);
        if (!Cesium.defined(picked) || !picked.id) return;

        const entity = picked.id;
        const countryName = entity._countryName;
        if (!countryName) return;

        const labelEnt = conflictLabelEntities.find(e => e._countryName === countryName);
        if (labelEnt) {
          const isShown = labelEnt.label.show.getValue ? labelEnt.label.show.getValue() : labelEnt.label.show;
          const wasClicked = labelEnt._clicked;
          // Toggle: if already clicked-sticky, hide it; otherwise make it sticky
          if (wasClicked) {
            labelEnt.label.show = false;
            labelEnt._clicked = false;
          } else {
            labelEnt.label.show = true;
            labelEnt._clicked = true;
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }
  } catch (e) {
    console.warn('Failed to load conflict zones:', e);
    notify('Failed to load conflict data', 'error');
  }
}

function clearConflicts() {
  if (conflictDataSource) {
    viewer.dataSources.remove(conflictDataSource, true);
    conflictDataSource = null;
  }
  // Remove label entities
  conflictLabelEntities.forEach(e => viewer.entities.remove(e));
  conflictLabelEntities = [];
  _hoveredCountryEntity = null;
  // Destroy handler
  if (conflictHoverHandler) {
    conflictHoverHandler.destroy();
    conflictHoverHandler = null;
  }
}

// ─── Airport Webcam PiP ───
function checkWebcamProximity(ac) {
  if (!ac || !ac.lat || !ac.lon) return;

  // Find nearest airport with webcam
  let nearest = null;
  let nearestDist = Infinity;
  for (const [icao, cam] of Object.entries(AIRPORT_CAMS)) {
    const apt = AIRPORTS.find(a => a.icao === icao);
    if (!apt) continue;
    const dist = haversineDistance(ac.lat, ac.lon, apt.lat, apt.lon);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = { icao, cam, apt, dist };
    }
  }

  if (!nearest) return;

  // Check if aircraft is approaching/departing (within trigger range)
  const isApproaching = nearestDist < WEBCAM_TRIGGER_KM && ac.alt && mToFt(ac.alt) < 15000;
  const isOnApproach = nearestDist < WEBCAM_TRIGGER_KM && ac.vertRate && ac.vertRate < -1;
  const isDeparting = nearestDist < WEBCAM_TRIGGER_KM && ac.vertRate && ac.vertRate > 2 && mToFt(ac.alt) < 10000;

  if ((isApproaching || isOnApproach || isDeparting) && activeWebcam !== nearest.icao) {
    showWebcamPip(nearest.icao, nearest.cam, nearest.apt, isOnApproach ? 'approach' : isDeparting ? 'departure' : 'nearby');
  } else if (nearestDist > WEBCAM_DISMISS_KM && activeWebcam === nearest.icao) {
    hideWebcamPip();
  }
}

function showWebcamPip(icao, cam, apt, phase) {
  activeWebcam = icao;
  let pip = document.getElementById('webcamPip');
  if (!pip) return;

  const videoId = cam.cams[0]; // primary cam
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&controls=1&modestbranding=1`;

  pip.innerHTML = `
    <div class="webcam-header">
      <span class="webcam-badge">${phase.toUpperCase()}</span>
      <span class="webcam-title">${cam.name} — ${apt.name}</span>
      <div class="webcam-controls">
        ${cam.cams.length > 1 ? `<button class="webcam-btn" onclick="cycleWebcam('${icao}')">CAM</button>` : ''}
        <button class="webcam-btn" onclick="hideWebcamPip()">✕</button>
      </div>
    </div>
    <iframe src="${embedUrl}" class="webcam-iframe" allow="autoplay; encrypted-media" allowfullscreen></iframe>
  `;
  pip.classList.add('visible');
  pip._camIndex = 0;
  pip._icao = icao;

  notify(`Live webcam: ${cam.name} airport — ${phase}`);
}

function cycleWebcam(icao) {
  const pip = document.getElementById('webcamPip');
  if (!pip || !pip._icao) return;
  const cam = AIRPORT_CAMS[icao];
  if (!cam || cam.cams.length <= 1) return;

  pip._camIndex = ((pip._camIndex || 0) + 1) % cam.cams.length;
  const videoId = cam.cams[pip._camIndex];
  const iframe = pip.querySelector('.webcam-iframe');
  if (iframe) {
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&controls=1&modestbranding=1`;
  }
  notify(`Switched to cam ${pip._camIndex + 1}/${cam.cams.length}`);
}

function hideWebcamPip() {
  activeWebcam = null;
  const pip = document.getElementById('webcamPip');
  if (pip) {
    pip.classList.remove('visible');
    const iframe = pip.querySelector('iframe');
    if (iframe) iframe.src = '';
  }
}

// Make webcam PiP draggable by header
function initWebcamDrag() {
  const pip = document.getElementById('webcamPip');
  if (!pip || isMobile()) return;
  let dragging = false, startX, startY, origLeft, origTop;

  pip.addEventListener('mousedown', function(e) {
    if (!e.target.closest('.webcam-header')) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = pip.getBoundingClientRect();
    origLeft = rect.left; origTop = rect.top;
    pip.style.transition = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    pip.style.left = (origLeft + e.clientX - startX) + 'px';
    pip.style.top = (origTop + e.clientY - startY) + 'px';
    pip.style.right = 'auto';
  });
  document.addEventListener('mouseup', function() {
    dragging = false;
    pip.style.transition = '';
  });
}

// ─── Minimap ───
let minimapCtx = null;
let worldPolygons = null;
let minimapAcPositions = []; // for click detection

async function initMinimap() {
  const canvas = document.getElementById('minimapCanvas');
  if (!canvas) return;
  minimapCtx = canvas.getContext('2d');

  // Load accurate world coastline data
  try {
    const resp = await fetch('assets/world.json');
    worldPolygons = await resp.json();
  } catch (e) {
    console.warn('Minimap: failed to load world data', e);
    worldPolygons = [];
  }

  // Click to select aircraft on minimap
  canvas.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let closest = null;
    let closestDist = 20; // max 20px click radius
    for (const ac of minimapAcPositions) {
      const d = Math.sqrt((ac.x - mx) ** 2 + (ac.y - my) ** 2);
      if (d < closestDist) {
        closestDist = d;
        closest = ac;
      }
    }
    if (closest) {
      selectAircraft(closest.icao);
    }
  });

  renderMinimap();
}

function renderMinimap() {
  if (!minimapCtx) return;
  const canvas = minimapCtx.canvas;
  const w = canvas.width;
  const h = canvas.height;

  // Clear
  minimapCtx.fillStyle = '#0a0a0a';
  minimapCtx.fillRect(0, 0, w, h);

  // Grid
  minimapCtx.strokeStyle = 'rgba(0, 255, 136, 0.04)';
  minimapCtx.lineWidth = 0.5;
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = h / 2 - (lat / 90) * (h / 2);
    minimapCtx.beginPath(); minimapCtx.moveTo(0, y); minimapCtx.lineTo(w, y); minimapCtx.stroke();
  }
  for (let lon = -150; lon <= 180; lon += 60) {
    const x = (lon + 180) / 360 * w;
    minimapCtx.beginPath(); minimapCtx.moveTo(x, 0); minimapCtx.lineTo(x, h); minimapCtx.stroke();
  }

  // Draw accurate world coastlines
  if (worldPolygons) {
    minimapCtx.fillStyle = 'rgba(0, 255, 136, 0.04)';
    minimapCtx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
    minimapCtx.lineWidth = 0.6;
    worldPolygons.forEach(poly => {
      minimapCtx.beginPath();
      poly.forEach(([lon, lat], i) => {
        const x = (lon + 180) / 360 * w;
        const y = h / 2 - (lat / 90) * (h / 2);
        if (i === 0) minimapCtx.moveTo(x, y);
        else minimapCtx.lineTo(x, y);
      });
      minimapCtx.closePath();
      minimapCtx.fill();
      minimapCtx.stroke();
    });
  }

  // Conflict zone markers on minimap
  if (showConflicts) {
    CONFLICT_COUNTRIES.forEach(c => {
      const cx = (c.lon + 180) / 360 * w;
      const cy = h / 2 - (c.lat / 90) * (h / 2);
      const r = c.severity === 'war' ? 8 : c.severity === 'high' ? 6 : 4;
      const alpha = c.severity === 'war' ? 0.35 : c.severity === 'high' ? 0.25 : 0.15;
      // Pulsing glow
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 800);
      minimapCtx.fillStyle = `rgba(255, 50, 50, ${alpha * pulse})`;
      minimapCtx.beginPath();
      minimapCtx.arc(cx, cy, r, 0, Math.PI * 2);
      minimapCtx.fill();
      // Outer ring
      minimapCtx.strokeStyle = `rgba(255, 50, 50, ${0.5 * pulse})`;
      minimapCtx.lineWidth = 0.8;
      minimapCtx.beginPath();
      minimapCtx.arc(cx, cy, r + 2, 0, Math.PI * 2);
      minimapCtx.stroke();
    });
  }

  // Schedule route lines on minimap (great-circle arcs)
  schedule.forEach(s => {
    const depApt = AIRPORTS.find(a => a.icao === s.departure);
    const arrApt = AIRPORTS.find(a => a.icao === s.arrival);
    if (!depApt || !arrApt) return;
    const isLive = scheduleMatches.has(s.id);
    const isOnboard = s.onboard && isLive;
    minimapCtx.strokeStyle = isOnboard ? 'rgba(218, 165, 32, 0.8)' : isLive ? 'rgba(0, 255, 136, 0.6)' : 'rgba(0, 180, 216, 0.4)';
    minimapCtx.lineWidth = isOnboard ? 2.5 : 1.5;
    minimapCtx.setLineDash(isLive ? [] : [4, 4]);

    // Great-circle arc on minimap
    const startCart = Cesium.Cartographic.fromDegrees(depApt.lon, depApt.lat);
    const endCart = Cesium.Cartographic.fromDegrees(arrApt.lon, arrApt.lat);
    const geodesic = new Cesium.EllipsoidGeodesic(startCart, endCart);
    const arcSteps = 40;
    minimapCtx.beginPath();
    for (let i = 0; i <= arcSteps; i++) {
      const t = i / arcSteps;
      const pt = geodesic.interpolateUsingFraction(t);
      const lon = Cesium.Math.toDegrees(pt.longitude);
      const lat = Cesium.Math.toDegrees(pt.latitude);
      const mx = (lon + 180) / 360 * w;
      const my = h / 2 - (lat / 90) * (h / 2);
      if (i === 0) minimapCtx.moveTo(mx, my);
      else minimapCtx.lineTo(mx, my);
    }
    minimapCtx.stroke();
    minimapCtx.setLineDash([]);

    // Airport dots for schedule
    [depApt, arrApt].forEach(apt => {
      const ax = (apt.lon + 180) / 360 * w;
      const ay = h / 2 - (apt.lat / 90) * (h / 2);
      minimapCtx.fillStyle = isOnboard ? 'rgba(218, 165, 32, 0.9)' : 'rgba(0, 180, 216, 0.7)';
      minimapCtx.beginPath();
      minimapCtx.arc(ax, ay, 3, 0, Math.PI * 2);
      minimapCtx.fill();
    });
  });

  // Aircraft positions — store for click detection
  minimapAcPositions = [];
  let acCount = 0;
  Object.values(aircraftData).forEach(ac => {
    if (!ac.lat || !ac.lon || !passesWatchlist(ac)) return;
    const x = (ac.lon + 180) / 360 * w;
    const y = h / 2 - (ac.lat / 90) * (h / 2);
    acCount++;
    minimapAcPositions.push({ icao: ac.icao, x, y });

    const isSelected = selectedAc === ac.icao;
    const onboardAc = isOnboardAircraft(ac.icao);
    const scheduledAc = isScheduledAircraft(ac.icao);

    if (isSelected) {
      // Pulsing ring for selected aircraft
      minimapCtx.strokeStyle = '#DAA520';
      minimapCtx.lineWidth = 1.5;
      minimapCtx.beginPath();
      minimapCtx.arc(x, y, 8, 0, Math.PI * 2);
      minimapCtx.stroke();
      minimapCtx.fillStyle = '#DAA520';
      minimapCtx.beginPath();
      minimapCtx.arc(x, y, 3, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.fillStyle = '#DAA520';
      minimapCtx.font = 'bold 10px monospace';
      minimapCtx.fillText(ac.callsign || ac.icao, x + 12, y + 4);
    } else if (onboardAc) {
      // Gold diamond for onboard flight
      minimapCtx.fillStyle = '#DAA520';
      minimapCtx.beginPath();
      minimapCtx.moveTo(x, y - 5); minimapCtx.lineTo(x + 4, y);
      minimapCtx.lineTo(x, y + 5); minimapCtx.lineTo(x - 4, y);
      minimapCtx.closePath(); minimapCtx.fill();
      minimapCtx.font = 'bold 10px monospace';
      minimapCtx.fillText(ac.callsign || ac.icao, x + 8, y + 4);
    } else if (scheduledAc) {
      // Larger green dot for scheduled flights
      minimapCtx.fillStyle = '#00ff88';
      minimapCtx.beginPath();
      minimapCtx.arc(x, y, 4, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.font = 'bold 9px monospace';
      minimapCtx.fillText(ac.callsign || ac.icao, x + 7, y + 3);
    } else {
      // Normal aircraft dot
      minimapCtx.fillStyle = '#00ff88';
      minimapCtx.beginPath();
      minimapCtx.arc(x, y, 2, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.fillStyle = 'rgba(0, 255, 136, 0.7)';
      minimapCtx.font = '8px monospace';
      minimapCtx.fillText(ac.callsign || ac.icao, x + 5, y + 3);
    }
  });

  // Update count in header
  const countEl = document.getElementById('minimapCount');
  if (countEl) countEl.textContent = acCount;

  // Camera viewport rect
  if (viewer) {
    try {
      const rect = viewer.camera.computeViewRectangle();
      if (rect) {
        const vx1 = (Cesium.Math.toDegrees(rect.west) + 180) / 360 * w;
        const vy1 = h / 2 - (Cesium.Math.toDegrees(rect.north) / 90) * (h / 2);
        const vx2 = (Cesium.Math.toDegrees(rect.east) + 180) / 360 * w;
        const vy2 = h / 2 - (Cesium.Math.toDegrees(rect.south) / 90) * (h / 2);
        minimapCtx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
        minimapCtx.lineWidth = 1;
        minimapCtx.strokeRect(vx1, vy1, vx2 - vx1, vy2 - vy1);
      }
    } catch (e) {}
  }
}

// Update minimap every 2 seconds
setInterval(() => { if (minimapCtx) renderMinimap(); }, 2000);

// ─── Draggable Panels ───
function makeDraggable(panelSelector, handleSelector) {
  const panel = document.querySelector(panelSelector);
  const handle = document.querySelector(handleSelector);
  if (!panel || !handle) return;

  let dragging = false, startX, startY, origLeft, origTop;

  function onStart(e) {
    // Don't drag if clicking a button/input inside the header
    if (e.target.closest('button, input, .close-btn')) return;
    dragging = true;
    const touch = e.touches ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;
    const rect = panel.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;
    // Switch to left/top positioning for dragging
    panel.style.left = origLeft + 'px';
    panel.style.top = origTop + 'px';
    panel.style.right = 'auto';
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    panel.style.left = Math.max(0, origLeft + dx) + 'px';
    panel.style.top = Math.max(0, origTop + dy) + 'px';
  }

  function onEnd() {
    dragging = false;
  }

  handle.addEventListener('mousedown', onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onEnd);
  handle.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
}

// ─── Init on Load ───
document.addEventListener('DOMContentLoaded', () => {
  tryAutoLogin();
  initMinimap();
  initWebcamDrag();
  makeDraggable('.schedule-panel', '.sched-header');
  makeDraggable('.watchlist-panel', '.wl-header');
  makeDraggable('.settings-panel', '.settings-panel .panel-header');
  makeDraggable('.detail-panel', '.detail-header');
});
