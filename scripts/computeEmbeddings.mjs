// 카탈로그 이미지들의 CLIP 임베딩을 계산해 assets/clothes_embeddings.json에 저장한다.
// 지금은 이미지가 몇 장뿐이라 @xenova/transformers(CPU, 순수 JS)로 이 자리에서 바로
// 계산한다. 카탈로그가 대량으로 늘어나면 scripts/colab_clip_embeddings.ipynb를
// Colab 무료 GPU에서 돌려 같은 포맷의 JSON을 생성하면 된다.
// 실행: npm run embeddings
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage } from '@xenova/transformers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'assets', 'clothes_embeddings.json');

const CATALOG_PATH = path.join(ROOT, 'src', 'shared', 'catalog.ts');

async function loadCatalogImagePaths() {
  // catalog.ts를 파싱하는 대신, id와 imagePath 쌍만 정규식으로 뽑아낸다
  // (빌드 없이 스크립트 단독 실행 가능하게 하기 위함).
  const src = await readFile(CATALOG_PATH, 'utf-8');
  const idRe = /id:\s*'([^']+)'/g;
  const pathRe = /imagePath:\s*'([^']+)'/g;
  const ids = [...src.matchAll(idRe)].map((m) => m[1]);
  const paths = [...src.matchAll(pathRe)].map((m) => m[1]);
  if (ids.length !== paths.length) {
    throw new Error('catalog.ts에서 id/imagePath 개수가 일치하지 않습니다');
  }
  return ids.map((id, i) => ({ id, imagePath: paths[i] }));
}

const items = await loadCatalogImagePaths();

console.log(`CLIP 모델 로딩 중... (${items.length}개 이미지)`);
const processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32');
const model = await CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32', {
  quantized: true,
});

const embeddings = {};
for (const { id, imagePath } of items) {
  const filePath = path.join(ROOT, 'public', imagePath);
  const image = await RawImage.read(filePath);
  const inputs = await processor(image);
  const { image_embeds } = await model(inputs);
  embeddings[id] = Array.from(image_embeds.data);
  console.log(`  ${id} <- ${imagePath} (${image_embeds.dims.join('x')})`);
}

await writeFile(OUT_PATH, JSON.stringify(embeddings));
console.log(`-> ${OUT_PATH}`);
