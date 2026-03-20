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
};

// ─── Unit Conversions ───
const msToKts = (ms) => ms ? Math.round(ms * 1.94384) : 0;
const mToFt = (m) => m ? Math.round(m * 3.28084) : 0;
const msToFpm = (ms) => ms ? Math.round(ms * 196.85) : 0;

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
    document.getElementById('searchBox').addEventListener('input', renderAircraftList);

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
  if (creds.token) {
    document.getElementById('cesiumToken').value = creds.token;
    document.getElementById('osUser').value = creds.user;
    document.getElementById('osPass').value = creds.pass;
  }
}

// ─── Keyboard Shortcuts ───
function handleKeyboard(e) {
  if (e.target.tagName === 'INPUT') return;
  switch (e.key.toLowerCase()) {
    case 'l': toggleLabels(); break;
    case 't': togglePaths(); break;
    case 'h': flyHome(); break;
    case 'r': refreshData(); break;
    case 'escape':
      if (selectedAc) closeDetail();
      break;
  }
}

// ─── Data Fetching ───
async function fetchAircraft() {
  try {
    const rect = viewer.camera.computeViewRectangle();
    let url = 'https://opensky-network.org/api/states/all';

    if (rect) {
      const west = Cesium.Math.toDegrees(rect.west).toFixed(2);
      const south = Cesium.Math.toDegrees(rect.south).toFixed(2);
      const east = Cesium.Math.toDegrees(rect.east).toFixed(2);
      const north = Cesium.Math.toDegrees(rect.north).toFixed(2);
      const latSpan = north - south;
      if (latSpan < CONFIG.ZOOM_BOUNDING_LAT) {
        url += `?lamin=${south}&lomin=${west}&lamax=${north}&lomax=${east}`;
      }
    }

    const headers = {};
    if (osUser && osPass) {
      headers['Authorization'] = 'Basic ' + btoa(osUser + ':' + osPass);
    }

    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.warn('OpenSky', resp.status);
      if (resp.status === 429) notify('Rate limited — wait a moment', 'error');
      return;
    }

    const data = await resp.json();
    if (!data.states) return;

    document.getElementById('pulseDot').style.background = 'var(--accent)';
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toTimeString().split(' ')[0];
    document.getElementById('acCount').textContent = data.states.length;
    stats.totalTracked = Math.max(stats.totalTracked, data.states.length);

    const newData = {};
    data.states.forEach(s => {
      newData[s[0]] = {
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
      };
    });

    aircraftData = newData;
    updateGlobe();
    renderAircraftList();

    // Update detail panel if aircraft is selected
    if (selectedAc && aircraftData[selectedAc]) {
      updateDetailPanel(aircraftData[selectedAc]);
    }
  } catch (err) {
    console.warn('Fetch error:', err);
    document.getElementById('pulseDot').style.background = 'var(--warn)';
  }
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

    if (aircraftEntities[ac.icao]) {
      const entity = aircraftEntities[ac.icao];
      entity.position = position;
      entity.point.color = ac.onGround
        ? Cesium.Color.fromCssColorString('#5a6a7a')
        : altitudeColor(alt);

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
        point: {
          pixelSize: 5,
          color: ac.onGround
            ? Cesium.Color.fromCssColorString('#5a6a7a')
            : altitudeColor(alt),
          outlineColor: Cesium.Color.fromCssColorString('rgba(0,0,0,0.5)'),
          outlineWidth: 1,
          scaleByDistance: new Cesium.NearFarScalar(1e4, 2.0, 1e7, 0.5),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: ac.callsign || ac.icao,
          font: '11px JetBrains Mono',
          fillColor: Cesium.Color.fromCssColorString('#c8d6e5'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(12, -4),
          scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 5e6, 0.0),
          show: showLabels && !!ac.callsign,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      entity._acIcao = ac.icao;
      aircraftEntities[ac.icao] = entity;
    }
  });

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
    .filter(ac => ac.lat && ac.lon && !ac.onGround)
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
      <span class="ac-origin">${ac.country}</span>
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

// ─── Init on Load ───
document.addEventListener('DOMContentLoaded', tryAutoLogin);
