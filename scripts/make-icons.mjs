// public/icon.svg から PWA 用の PNG を作る。アイコンを描き直したときだけ手で実行する
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
