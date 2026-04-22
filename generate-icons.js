const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Criar pasta icons se não existir
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Logo 1 (1:1) para ícones
const logo1Path = path.join(__dirname, 'public', 'logo1.png');

// Tamanhos necessários para PWA e favicons
const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Gerar todos os ícones
async function generateIcons() {
  console.log('🎨 Gerando ícones...\n');

  for (const { size, name } of sizes) {
    try {
      await sharp(logo1Path)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(iconsDir, name));
      console.log(`✅ ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Erro ao gerar ${name}:`, error.message);
    }
  }

  // Gerar maskable icon (com padding para PWA)
  try {
    await sharp(logo1Path)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 107, b: 53, alpha: 1 } // Cor tema #FF6B35
      })
      .extend({
        top: 51,
        bottom: 51,
        left: 51,
        right: 51,
        background: { r: 255, g: 107, b: 53, alpha: 1 }
      })
      .png()
      .toFile(path.join(iconsDir, 'maskable-icon.png'));
    console.log('✅ maskable-icon.png (512x512 com padding)');
  } catch (error) {
    console.error('❌ Erro ao gerar maskable-icon:', error.message);
  }

  // Gerar OG image (1200x630) usando logo2 (lateral)
  const logo2Path = path.join(__dirname, 'public', 'logo2.png');
  try {
    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: 9, g: 9, b: 11, alpha: 1 } // bg-background
      }
    })
    .composite([{
      input: await sharp(logo2Path)
        .resize(800, null, { fit: 'inside' })
        .toBuffer(),
      gravity: 'center'
    }])
    .png()
    .toFile(path.join(iconsDir, 'og-image.png'));
    console.log('✅ og-image.png (1200x630)');
  } catch (error) {
    console.error('❌ Erro ao gerar og-image:', error.message);
  }

  // Gerar favicon.ico (32x32)
  try {
    await sharp(logo1Path)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFile(path.join(__dirname, 'public', 'favicon.ico'));
    console.log('✅ favicon.ico (32x32)');
  } catch (error) {
    console.error('❌ Erro ao gerar favicon.ico:', error.message);
  }

  console.log('\n✨ Todos os ícones foram gerados com sucesso!');
}

generateIcons().catch(console.error);
