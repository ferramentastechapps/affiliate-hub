# 📁 Logos e Ícones

## Arquivos de Logo

### `logo1.png` (1:1 - Quadrado)
- **Uso**: Base para todos os ícones, favicons e PWA icons
- **Formato**: Quadrado (1:1)
- **Tamanho**: ~1.6MB

### `logo2.png` (Lateral - Horizontal)
- **Uso**: Header do site e OG image
- **Formato**: Horizontal/Lateral
- **Tamanho**: ~2.3MB

## Ícones Gerados

Todos os ícones foram gerados automaticamente usando `generate-icons.js`:

### Favicons
- `favicon.ico` (32x32) - Favicon principal
- `icons/favicon-16x16.png` (16x16)
- `icons/favicon-32x32.png` (32x32)

### PWA Icons
- `icons/icon-72x72.png`
- `icons/icon-96x96.png`
- `icons/icon-128x128.png`
- `icons/icon-144x144.png`
- `icons/icon-152x152.png`
- `icons/icon-192x192.png`
- `icons/icon-384x384.png`
- `icons/icon-512x512.png`
- `icons/maskable-icon.png` (512x512 com padding e cor tema)

### Apple Touch Icon
- `icons/apple-touch-icon.png` (180x180)

### Open Graph
- `icons/og-image.png` (1200x630) - Imagem para redes sociais

## Regenerar Ícones

Se precisar atualizar os logos e regenerar todos os ícones:

```bash
# 1. Substitua logo1.png e/ou logo2.png
# 2. Execute o script:
node generate-icons.js
```

## Estrutura de Uso

- **Header**: `/logo2.png` (logo horizontal)
- **Favicon**: `/favicon.ico` e `/icons/favicon-*.png`
- **PWA**: Todos os `icons/icon-*.png` (definidos em `manifest.json`)
- **Apple**: `/icons/apple-touch-icon.png`
- **Social**: `/icons/og-image.png` (Open Graph e Twitter Cards)
