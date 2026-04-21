import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE = path.join(process.cwd(), 'public', 'logo.png');
const OUT    = path.join(process.cwd(), 'public', 'icons');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ── Ícones PWA padrão ────────────────────────────────────────
const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generatePwaIcons() {
  for (const size of PWA_SIZES) {
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
      .png()
      .toFile(path.join(OUT, `icon-${size}x${size}.png`));
    console.log(`✅ icon-${size}x${size}.png`);
  }
}

// ── Apple Touch Icon 180x180 ─────────────────────────────────
async function generateAppleTouchIcon() {
  await sharp(SOURCE)
    .resize(180, 180, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(OUT, 'apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png');
}

// ── Favicons ─────────────────────────────────────────────────
async function generateFavicons() {
  await sharp(SOURCE)
    .resize(32, 32, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(OUT, 'favicon-32x32.png'));
  console.log('✅ favicon-32x32.png');

  await sharp(SOURCE)
    .resize(16, 16, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(OUT, 'favicon-16x16.png'));
  console.log('✅ favicon-16x16.png');

  // favicon.ico = 32x32 PNG copiado (browsers aceitam PNG como .ico)
  await sharp(SOURCE)
    .resize(32, 32, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(process.cwd(), 'public', 'favicon.ico'));
  console.log('✅ favicon.ico');
}

// ── Maskable icon (512x512 com 20% de padding) ───────────────
async function generateMaskableIcon() {
  const SIZE    = 512;
  const PADDING = Math.round(SIZE * 0.2); // 20% = 102px cada lado
  const INNER   = SIZE - PADDING * 2;     // 308px

  // Redimensiona o logo para o tamanho interno
  const logoBuffer = await sharp(SOURCE)
    .resize(INNER, INNER, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Cria fundo escuro e compõe o logo centralizado
  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 255 },
    },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT, 'maskable-icon.png'));
  console.log('✅ maskable-icon.png');
}

// ── OG Image 1200x630 ────────────────────────────────────────
async function generateOgImage() {
  const W = 1200, H = 630;
  const LOGO_H = 260;

  const logoBuffer = await sharp(SOURCE)
    .resize(null, LOGO_H, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoBuffer).metadata();
  const logoW    = logoMeta.width ?? 260;

  // Fundo gradiente laranja → roxo via SVG
  const bgSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#FF6B35"/>
          <stop offset="50%"  stop-color="#F7C59F"/>
          <stop offset="100%" stop-color="#7B2FBE"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
      <text x="${W/2}" y="${H - 60}" text-anchor="middle"
            font-family="Arial Black, sans-serif" font-size="42"
            font-weight="900" fill="rgba(255,255,255,0.9)">
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

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('\n🎨 Gerando ícones PWA para 123 Testando...\n');
  await generatePwaIcons();
  await generateAppleTouchIcon();
  await generateFavicons();
  await generateMaskableIcon();
  await generateOgImage();
  console.log('\n✅ Todos os ícones gerados em /public/icons/\n');
}

main().catch(err => { console.error('❌', err); process.exit(1); });
