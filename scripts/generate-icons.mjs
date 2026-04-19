import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'public', 'logo.png');
const OUT    = path.join(ROOT, 'public', 'icons');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BG = { r: 255, g: 107, b: 53, alpha: 255 };

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function pwaIcons() {
  for (const size of PWA_SIZES) {
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: BG })
      .png()
      .toFile(path.join(OUT, `icon-${size}x${size}.png`));
    console.log(`✅ icon-${size}x${size}.png`);
  }
}

async function appleTouchIcon() {
  await sharp(SOURCE)
    .resize(180, 180, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(OUT, 'apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png');
}

async function favicons() {
  for (const size of [32, 16]) {
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: BG })
      .png()
      .toFile(path.join(OUT, `favicon-${size}x${size}.png`));
    console.log(`✅ favicon-${size}x${size}.png`);
  }
  // favicon.ico como PNG 32x32 (browsers modernos aceitam)
  await sharp(SOURCE)
    .resize(32, 32, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(ROOT, 'public', 'favicon.ico'));
  console.log('✅ favicon.ico');
}

async function maskableIcon() {
  const SIZE    = 512;
  const PADDING = Math.round(SIZE * 0.2);
  const INNER   = SIZE - PADDING * 2;

  const logoBuffer = await sharp(SOURCE)
    .resize(INNER, INNER, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: BG },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, 'maskable-icon.png'));
  console.log('✅ maskable-icon.png');
}

async function ogImage() {
  const W = 1200, H = 630, LOGO_H = 260;

  const logoBuffer = await sharp(SOURCE)
    .resize(null, LOGO_H, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const { width: logoW = 260 } = await sharp(logoBuffer).metadata();

  const bgSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="#FF6B35"/>
        <stop offset="50%"  stop-color="#F7C59F"/>
        <stop offset="100%" stop-color="#7B2FBE"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <text x="${W/2}" y="${H-55}" text-anchor="middle"
          font-family="Arial Black,sans-serif" font-size="40"
          font-weight="900" fill="rgba(255,255,255,0.92)">
      Melhores cupons e promoções do Brasil
    </text>
  </svg>`;

  await sharp(Buffer.from(bgSvg))
    .composite([{
      input: logoBuffer,
      left: Math.round((W - logoW) / 2),
      top:  Math.round((H - LOGO_H) / 2) - 30,
    }])
    .png()
    .toFile(path.join(OUT, 'og-image.png'));
  console.log('✅ og-image.png');
}

console.log('\n🎨 Gerando ícones PWA para 123 Testando...\n');
await pwaIcons();
await appleTouchIcon();
await favicons();
await maskableIcon();
await ogImage();
console.log('\n✅ Todos os ícones gerados em /public/icons/\n');
