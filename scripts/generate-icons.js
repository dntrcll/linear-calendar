const fs = require('fs');
const path = require('path');

// SVG icon content (Timeline OS logo)
const createSVG = (size, maskable = false) => {
  const padding = maskable ? size * 0.1 : 0; // 10% padding for maskable
  const iconSize = size - (padding * 2);
  const scale = iconSize / 512;
  const offset = padding;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F97316"/>
      <stop offset="50%" style="stop-color:#FB923C"/>
      <stop offset="100%" style="stop-color:#FDBA74"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.22}" ry="${maskable ? 0 : size * 0.22}" fill="url(#bgGradient)"/>

  <!-- Timeline icon -->
  <g transform="translate(${offset + iconSize/2}, ${offset + iconSize/2}) scale(${scale})">
    <!-- Vertical line -->
    <line x1="0" y1="-140" x2="0" y2="140" stroke="white" stroke-width="28" stroke-linecap="round"/>

    <!-- Horizontal branches -->
    <line x1="0" y1="-100" x2="80" y2="-100" stroke="white" stroke-width="28" stroke-linecap="round"/>
    <line x1="0" y1="0" x2="55" y2="0" stroke="white" stroke-width="28" stroke-linecap="round"/>
    <line x1="0" y1="100" x2="110" y2="100" stroke="white" stroke-width="28" stroke-linecap="round"/>

    <!-- Dots at branch points -->
    <circle cx="0" cy="-100" r="22" fill="white"/>
    <circle cx="0" cy="0" r="22" fill="white"/>
    <circle cx="0" cy="100" r="22" fill="white"/>
  </g>
</svg>`;
};

// Create splash screen SVG
const createSplashSVG = (width, height) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F172A"/>
      <stop offset="100%" style="stop-color:#1E293B"/>
    </linearGradient>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F97316"/>
      <stop offset="50%" style="stop-color:#FB923C"/>
      <stop offset="100%" style="stop-color:#FDBA74"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#splashBg)"/>

  <!-- Centered icon -->
  <g transform="translate(${width/2}, ${height/2})">
    <!-- Icon background circle -->
    <circle cx="0" cy="0" r="60" fill="url(#iconGradient)"/>

    <!-- Timeline icon (scaled down) -->
    <g transform="scale(0.2)">
      <line x1="0" y1="-140" x2="0" y2="140" stroke="white" stroke-width="28" stroke-linecap="round"/>
      <line x1="0" y1="-100" x2="80" y2="-100" stroke="white" stroke-width="28" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="55" y2="0" stroke="white" stroke-width="28" stroke-linecap="round"/>
      <line x1="0" y1="100" x2="110" y2="100" stroke="white" stroke-width="28" stroke-linecap="round"/>
      <circle cx="0" cy="-100" r="22" fill="white"/>
      <circle cx="0" cy="0" r="22" fill="white"/>
      <circle cx="0" cy="100" r="22" fill="white"/>
    </g>

    <!-- App name -->
    <text y="100" text-anchor="middle" fill="#F97316" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600">Timeline OS</text>
  </g>
</svg>`;
};

const publicDir = path.join(__dirname, '..', 'public');

// Icon sizes to generate
const iconSizes = [
  { name: 'icon-16.png', size: 16, maskable: false },
  { name: 'icon-32.png', size: 32, maskable: false },
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'apple-touch-icon-152.png', size: 152, maskable: false },
  { name: 'apple-touch-icon-167.png', size: 167, maskable: false },
  { name: 'apple-touch-icon-180.png', size: 180, maskable: false },
];

// Splash screen sizes
const splashSizes = [
  { name: 'splash-1125x2436.png', width: 1125, height: 2436 },
  { name: 'splash-828x1792.png', width: 828, height: 1792 },
  { name: 'splash-1242x2688.png', width: 1242, height: 2688 },
  { name: 'splash-1170x2532.png', width: 1170, height: 2532 },
  { name: 'splash-1284x2778.png', width: 1284, height: 2778 },
  { name: 'splash-1179x2556.png', width: 1179, height: 2556 },
  { name: 'splash-1290x2796.png', width: 1290, height: 2796 },
  { name: 'splash-2048x2732.png', width: 2048, height: 2732 },
];

// Screenshots
const screenshots = [
  { name: 'screenshot-wide.png', width: 1280, height: 720 },
  { name: 'screenshot-narrow.png', width: 750, height: 1334 },
  { name: 'og-image.png', width: 1200, height: 630 },
];

console.log('Generating PWA icons and splash screens...\n');

// Try to use sharp if available, otherwise save as SVG
let sharp;
try {
  sharp = require('sharp');
  console.log('Using sharp for PNG generation.\n');
} catch (e) {
  console.log('Sharp not found. Saving as SVG files (convert to PNG manually or install sharp).\n');
  console.log('To install sharp: npm install sharp\n');
}

async function generateIcons() {
  for (const icon of iconSizes) {
    const svg = createSVG(icon.size, icon.maskable);
    const outputPath = path.join(publicDir, icon.name);

    if (sharp) {
      try {
        await sharp(Buffer.from(svg))
          .png()
          .toFile(outputPath);
        console.log(`Created: ${icon.name}`);
      } catch (err) {
        console.error(`Error creating ${icon.name}:`, err.message);
      }
    } else {
      // Save as SVG for manual conversion
      const svgPath = outputPath.replace('.png', '.svg');
      fs.writeFileSync(svgPath, svg);
      console.log(`Created SVG: ${path.basename(svgPath)} (convert to PNG)`);
    }
  }
}

async function generateSplashScreens() {
  for (const splash of splashSizes) {
    const svg = createSplashSVG(splash.width, splash.height);
    const outputPath = path.join(publicDir, splash.name);

    if (sharp) {
      try {
        await sharp(Buffer.from(svg))
          .png()
          .toFile(outputPath);
        console.log(`Created: ${splash.name}`);
      } catch (err) {
        console.error(`Error creating ${splash.name}:`, err.message);
      }
    } else {
      const svgPath = outputPath.replace('.png', '.svg');
      fs.writeFileSync(svgPath, svg);
      console.log(`Created SVG: ${path.basename(svgPath)} (convert to PNG)`);
    }
  }
}

async function generateScreenshots() {
  for (const screenshot of screenshots) {
    const svg = createSplashSVG(screenshot.width, screenshot.height);
    const outputPath = path.join(publicDir, screenshot.name);

    if (sharp) {
      try {
        await sharp(Buffer.from(svg))
          .png()
          .toFile(outputPath);
        console.log(`Created: ${screenshot.name}`);
      } catch (err) {
        console.error(`Error creating ${screenshot.name}:`, err.message);
      }
    } else {
      const svgPath = outputPath.replace('.png', '.svg');
      fs.writeFileSync(svgPath, svg);
      console.log(`Created SVG: ${path.basename(svgPath)} (convert to PNG)`);
    }
  }
}

async function main() {
  console.log('--- Generating Icons ---');
  await generateIcons();

  console.log('\n--- Generating Splash Screens ---');
  await generateSplashScreens();

  console.log('\n--- Generating Screenshots ---');
  await generateScreenshots();

  console.log('\nDone! Icons generated in /public directory.');

  if (!sharp) {
    console.log('\nNote: SVG files were created. To convert to PNG:');
    console.log('1. Install sharp: npm install sharp');
    console.log('2. Run this script again: node scripts/generate-icons.js');
    console.log('\nOr use an online converter like https://svgtopng.com/');
  }
}

main().catch(console.error);
