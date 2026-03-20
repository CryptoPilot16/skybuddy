import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { writeFileSync } from 'fs';

const W = 2048;
const H = 1024;

// Kalitta Air colors
const WHITE = '#F5F3F0';
const RED = '#CC2222';
const GOLD = '#B8960C';
const BLACK = '#1A1A1A';
const GRAY_BG = '#B0B0B0';

function createFuselageSVG() {
  // FR24 fuselage.png UV layout (2048x1024):
  // Top row (y ~20-280): RIGHT side fuselage, nose at left (~x:80), tail at right (~x:1980)
  // Middle row (y ~310-530): LEFT side fuselage, nose at left (~x:60), tail at right (~x:2000)
  // Bottom section (y ~560-1020): Tail - vertical stabilizer panels + horizontal stab
  //   The vertical stab has 3 white panels in V shape against gray background

  // "KALITTA AIR" text positioning - forward upper fuselage area
  // On reference photo, text is roughly 30-55% from nose, at the window line
  const fontSize = 58;
  const letterSpacing = 3;

  // Right side fuselage text (top row) - nose at x:80, tail at x:1980
  // Text at roughly 35-60% = x:750-1220
  const textRX = 950;
  const textRY = 128; // vertical center of top row

  // Left side fuselage text (middle row) - REVERSED (mirrored)
  // On the left side, text reads right-to-left in UV space
  const textLX = 950;
  const textLY = 408;

  // Gold accent lines (thin lines flanking the text, Kalitta signature)
  const accentW = 500;
  const lineH = 3;

  function kalittaText(cx, cy, mirrored = false) {
    const lx = cx - accentW / 2;
    // The Kalitta logo has small gold chevron wings before the text
    return `
      <g${mirrored ? ` transform="translate(${cx * 2}, 0) scale(-1, 1)"` : ''}>
        <!-- Gold accent lines above -->
        <rect x="${lx}" y="${cy - 38}" width="${accentW}" height="${lineH}" fill="${GOLD}"/>
        <rect x="${lx}" y="${cy - 34}" width="${accentW}" height="${lineH}" fill="${GOLD}" opacity="0.6"/>
        <!-- KALITTA AIR text -->
        <text x="${cx}" y="${cy + 18}" text-anchor="middle"
              font-family="Arial Black, Impact, Helvetica, sans-serif"
              font-weight="900" font-size="${fontSize}"
              fill="${BLACK}" letter-spacing="${letterSpacing}">KALITTA AIR</text>
        <!-- Gold accent lines below -->
        <rect x="${lx}" y="${cy + 30}" width="${accentW}" height="${lineH}" fill="${GOLD}"/>
        <rect x="${lx}" y="${cy + 34}" width="${accentW}" height="${lineH}" fill="${GOLD}" opacity="0.6"/>
      </g>
    `;
  }

  // Tail stripes - diagonal red/gold on the vertical stabilizer
  // The bottom section has the vertical stab panels roughly:
  //   Left panel: x:60-520, y:600-1000 (angled)
  //   Center: x:880-1140, y:580-1000 (narrow vertical)
  //   Right panel: x:1450-1960, y:600-1000 (angled)
  // Need to fill these areas with diagonal stripes

  const stripeAngle = -25; // degrees, lower-left to upper-right
  const stripeW = 65;
  const gap = 4;
  const pattern = [
    { color: WHITE, w: 100 },
    { color: RED, w: stripeW },
    { color: BLACK, w: gap },
    { color: GOLD, w: stripeW },
    { color: BLACK, w: gap },
    { color: RED, w: stripeW },
    { color: BLACK, w: gap },
    { color: GOLD, w: stripeW },
    { color: BLACK, w: gap },
    { color: RED, w: stripeW },
    { color: BLACK, w: gap },
    { color: GOLD, w: stripeW },
    { color: BLACK, w: gap },
    { color: RED, w: stripeW },
  ];

  let tailStripes = '';
  // Create a pattern of diagonal stripes that covers the tail area
  // We'll use a group with a clip path for each tail panel region

  function makeStripes(startX) {
    let stripes = '';
    let x = startX;
    for (const p of pattern) {
      const rad = stripeAngle * Math.PI / 180;
      const dx = Math.cos(rad) * p.w;
      const dy = Math.sin(rad) * p.w;
      // Draw a wide parallelogram
      const h = 600; // tall enough to cover tail area
      stripes += `<polygon points="${x},${1100} ${x + dx},${1100 - h} ${x + dx + p.w},${1100 - h} ${x + p.w},${1100}" fill="${p.color}"/>`;
      x += p.w;
    }
    return stripes;
  }

  // Registration number on rear fuselage
  const regFontSize = 28;
  // Right side - near tail end (x ~1650-1800)
  const regRX = 1720;
  const regRY = 180;
  // Left side
  const regLX = 1720;
  const regLY = 460;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <!-- Gray background (matches original) -->
    <rect width="${W}" height="${H}" fill="${GRAY_BG}"/>

    <!-- ===== RIGHT SIDE FUSELAGE (top row, y:20-280) ===== -->
    <!-- White fuselage body -->
    <ellipse cx="${W/2}" cy="150" rx="960" ry="135" fill="${WHITE}"/>
    <!-- Nose cone rounding -->
    <ellipse cx="100" cy="150" rx="80" ry="100" fill="${WHITE}"/>

    <!-- Cargo doors (small rectangles) -->
    <rect x="260" y="55" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="440" y="55" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="620" y="55" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="800" y="55" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="980" y="55" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="1160" y="55" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="1340" y="55" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <!-- Lower doors -->
    <rect x="200" y="190" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="600" y="190" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="900" y="190" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="1200" y="190" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="1500" y="190" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <!-- Anti-collision light -->
    <rect x="275" y="94" width="6" height="6" fill="#CC0000"/>
    <!-- Tail light -->
    <rect x="1840" y="94" width="6" height="6" fill="#CC0000"/>

    <!-- Cockpit windows -->
    <ellipse cx="55" cy="130" rx="10" ry="12" fill="#222"/>
    <ellipse cx="78" cy="130" rx="10" ry="12" fill="#222"/>

    <!-- KALITTA AIR text on right side -->
    ${kalittaText(textRX, textRY)}

    <!-- Registration on right side -->
    <text x="${regRX}" y="${regRY}" text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif" font-weight="bold"
          font-size="${regFontSize}" fill="${BLACK}">N795CK</text>

    <!-- ===== LEFT SIDE FUSELAGE (middle row, y:310-530) ===== -->
    <ellipse cx="${W/2}" cy="420" rx="970" ry="120" fill="${WHITE}"/>
    <ellipse cx="80" cy="420" rx="70" ry="90" fill="${WHITE}"/>

    <!-- Doors on left side -->
    <rect x="260" y="340" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="600" y="340" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="900" y="340" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="1200" y="340" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="1500" y="340" width="18" height="30" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <!-- Lower -->
    <rect x="200" y="460" width="18" height="25" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <rect x="1650" y="460" width="22" height="28" rx="2" fill="none" stroke="#C0C0C0" stroke-width="1"/>
    <!-- Anti-collision -->
    <rect x="1850" y="370" width="6" height="6" fill="#CC0000"/>
    <rect x="1850" y="500" width="6" height="6" fill="#CC0000"/>

    <!-- KALITTA AIR text on left side -->
    ${kalittaText(textLX, textLY)}

    <!-- Registration on left side -->
    <text x="${regLX}" y="${regLY}" text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif" font-weight="bold"
          font-size="${regFontSize}" fill="${BLACK}">N795CK</text>

    <!-- ===== TAIL / VERTICAL STABILIZER (bottom section, y:560-1020) ===== -->
    <!-- The tail area has three angled panels forming the vertical stabilizer -->

    <!-- Clip regions for tail panels and fill with diagonal stripes -->
    <defs>
      <clipPath id="tailLeft">
        <polygon points="60,1000 520,1000 340,590 60,590"/>
      </clipPath>
      <clipPath id="tailCenter">
        <polygon points="870,1010 1150,1010 1150,570 870,570"/>
      </clipPath>
      <clipPath id="tailRight">
        <polygon points="1450,1000 1960,1000 1960,590 1670,590"/>
      </clipPath>
    </defs>

    <!-- Left tail panel with stripes -->
    <g clip-path="url(#tailLeft)">
      <!-- White base -->
      <rect x="0" y="540" width="600" height="500" fill="${WHITE}"/>
      <!-- Diagonal stripes -->
      ${generateDiagonalStripes(60, 540, 600, 500, -30)}
    </g>

    <!-- Center tail panel with stripes -->
    <g clip-path="url(#tailCenter)">
      <rect x="830" y="540" width="360" height="500" fill="${WHITE}"/>
      ${generateDiagonalStripes(830, 540, 360, 500, -30)}
    </g>

    <!-- Right tail panel with stripes -->
    <g clip-path="url(#tailRight)">
      <rect x="1400" y="540" width="600" height="500" fill="${WHITE}"/>
      ${generateDiagonalStripes(1400, 540, 600, 500, -30)}
    </g>
  </svg>`;
}

function generateDiagonalStripes(ox, oy, w, h, angleDeg) {
  // Generate diagonal red/gold stripes covering the given area
  const angle = angleDeg * Math.PI / 180;
  const stripeW = 55;
  const gap = 3;
  const colors = [RED, GOLD, RED, GOLD, RED, GOLD];

  let stripes = '';
  // We need to cover the area with diagonal stripes starting from the tail end (right side)
  // The stripes should start roughly 40% from the left of the panel
  const startOffset = w * 0.25;

  let pos = startOffset;
  for (const color of colors) {
    // Each stripe is a parallelogram
    const dy = Math.tan(angle) * stripeW;
    stripes += `<polygon points="${ox + pos},${oy + h} ${ox + pos + stripeW},${oy + h} ${ox + pos + stripeW + Math.abs(dy)},${oy} ${ox + pos + Math.abs(dy)},${oy}" fill="${color}"/>`;
    pos += stripeW + gap;
    // Black separator
    stripes += `<polygon points="${ox + pos - gap},${oy + h} ${ox + pos},${oy + h} ${ox + pos + Math.abs(dy)},${oy} ${ox + pos - gap + Math.abs(dy)},${oy}" fill="${BLACK}"/>`;
  }
  return stripes;
}

async function main() {
  console.log('Creating Kalitta Air 777 fuselage texture...');

  const svg = createFuselageSVG();
  const textureBuf = await sharp(Buffer.from(svg))
    .resize(W, H)
    .png()
    .toBuffer();
  writeFileSync('777/kalitta_fuselage_preview.png', textureBuf);
  console.log('Preview saved to 777/kalitta_fuselage_preview.png');

  // Now build b77k.glb by cloning FR24 b772 and replacing fuselage texture
  const io = new NodeIO();
  const doc = await io.read('assets/b772.glb');

  // Find and replace the fuselage texture
  for (const tex of doc.getRoot().listTextures()) {
    if (tex.getName() === 'fuselage.png') {
      tex.setImage(new Uint8Array(textureBuf));
      tex.setMimeType('image/png');
      console.log('Replaced fuselage texture');
    }
  }

  await io.write('assets/b77k.glb', doc);
  console.log('Saved assets/b77k.glb');
}

main().catch(console.error);
