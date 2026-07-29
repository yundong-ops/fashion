// 무신사 스냅 1~10 레퍼런스의 평균 밝기/색감을 계산해 assets/mood-refs/tone.json에 저장한다.
// 합성 결과 후처리(src/server/postprocess/mood.ts)가 이 값을 기준으로 톤을 보정한다.
// 한 번만 실행하면 되는 오프라인 스크립트: npm run mood-tone
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REFS_DIR = path.resolve(__dirname, '../assets/mood-refs');
const OUT_PATH = path.join(REFS_DIR, 'tone.json');

const files = (await readdir(REFS_DIR)).filter((f) => /^snap-\d+\.png$/i.test(f));
if (files.length === 0) {
  throw new Error(`레퍼런스 이미지를 찾지 못했습니다: ${REFS_DIR}`);
}

let rSum = 0;
let gSum = 0;
let bSum = 0;
let count = 0;

for (const file of files) {
  const { data, info } = await sharp(path.join(REFS_DIR, file))
    .resize(64, 64, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
    count += 1;
  }
}

const avgColor = { r: rSum / count, g: gSum / count, b: bSum / count };
const brightness = 0.299 * avgColor.r + 0.587 * avgColor.g + 0.114 * avgColor.b;

const tone = { avgColor, brightness, sampleCount: files.length };
await writeFile(OUT_PATH, JSON.stringify(tone, null, 2));
console.log(`${files.length}개 레퍼런스에서 톤 계산 완료:`, tone, '\n->', OUT_PATH);
