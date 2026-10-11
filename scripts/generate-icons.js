import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#030712" />
    </radialGradient>
    <radialGradient id="aura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.35" />
      <stop offset="60%" stop-color="#6366f1" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="star" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="url(#bg)" />

  <!-- Outer Sonic Glow Aura -->
  <circle cx="256" cy="256" r="190" fill="url(#aura)" />

  <!-- Frequency Orbit Rings -->
  <circle cx="256" cy="256" r="150" fill="none" stroke="#818cf8" stroke-width="3" stroke-opacity="0.4" stroke-dasharray="8 8" />
  <circle cx="256" cy="256" r="115" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-opacity="0.5" />

  <!-- Central Star of Lyra -->
  <path d="M 256,120 Q 256,220 356,256 Q 256,292 256,392 Q 256,292 156,256 Q 256,220 256,120 Z" fill="url(#star)" />
  
  <!-- Core Luminous Spark -->
  <circle cx="256" cy="256" r="28" fill="#ffffff" opacity="0.95" />
  
  <!-- Sparkles -->
  <circle cx="360" cy="160" r="8" fill="#fef08a" opacity="0.8" />
  <circle cx="150" cy="350" r="6" fill="#818cf8" opacity="0.8" />
  <circle cx="160" cy="170" r="5" fill="#fde047" opacity="0.7" />
  <circle cx="350" cy="340" r="7" fill="#fbbf24" opacity="0.75" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');
console.log('Created public/icon.svg');

// 2. Programmatically generate PNG files (192x192, 512x512, apple-touch-icon 180x180)
function generatePngIcon(size, filename) {
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = size * 0.46;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded squircle background
      const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
      if (maxDim > size * 0.48) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Background gradient
      const normDist = dist / radius;
      let r = 8 + Math.floor(15 * (1 - normDist));
      let g = 12 + Math.floor(20 * (1 - normDist));
      let b = 25 + Math.floor(65 * (1 - normDist));
      let a = 255;

      // Glow aura
      if (dist < size * 0.38) {
        const auraFactor = (1 - dist / (size * 0.38));
        r += Math.floor(70 * auraFactor);
        g += Math.floor(60 * auraFactor);
        b += Math.floor(40 * auraFactor);
      }

      // 4-pointed Star of Lyra
      const ax = Math.abs(dx) / (size * 0.28);
      const ay = Math.abs(dy) / (size * 0.28);
      const starMetric = Math.pow(ax, 0.5) + Math.pow(ay, 0.5);

      if (starMetric < 1.0) {
        const starBrightness = 1 - starMetric;
        r = Math.min(255, r + Math.floor(240 * starBrightness));
        g = Math.min(255, g + Math.floor(190 * starBrightness));
        b = Math.min(255, b + Math.floor(50 * starBrightness));
      }

      // Center bright core
      if (dist < size * 0.07) {
        const coreFactor = 1 - dist / (size * 0.07);
        r = Math.min(255, r + Math.floor(255 * coreFactor));
        g = Math.min(255, g + Math.floor(255 * coreFactor));
        b = Math.min(255, b + Math.floor(240 * coreFactor));
      }

      png.data[idx] = Math.min(255, r);
      png.data[idx + 1] = Math.min(255, g);
      png.data[idx + 2] = Math.min(255, b);
      png.data[idx + 3] = a;
    }
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(path.join(publicDir, filename), buffer);
  console.log(`Created public/${filename} (${size}x${size})`);
}

generatePngIcon(192, 'pwa-192x192.png');
generatePngIcon(512, 'pwa-512x512.png');
generatePngIcon(180, 'apple-touch-icon.png');
generatePngIcon(512, 'pwa-maskable-512x512.png');
