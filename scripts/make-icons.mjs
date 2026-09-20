// Builds the PNGs for the PWA from public/icon.svg. Run by hand, only when the icon has been redrawn
import sharp from 'sharp';

for (const [size, name] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png'],
]) {
  await sharp('public/icon.svg', { density: 300 })
    .resize(size, size)
    .png()
    .toFile(`public/${name}`);
}
