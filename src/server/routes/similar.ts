import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Hono } from 'hono';
import { CATALOG } from '../../shared/catalog';
import { findSimilarHeuristic } from '../../shared/recommend';

export const similarRoute = new Hono();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EMBEDDINGS_PATH = path.resolve(__dirname, '../../../assets/clothes_embeddings.json');

type Embeddings = Record<string, number[]>;

let cached: Embeddings | null = null;

async function loadEmbeddings(): Promise<Embeddings> {
  if (cached) return cached;
  try {
    cached = JSON.parse(await readFile(EMBEDDINGS_PATH, 'utf-8')) as Embeddings;
  } catch {
    cached = {};
  }
  return cached;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

/**
 * CLIP 임베딩 기반 코사인 유사도로 유사 상품 top-N을 계산한다.
 * 순수 JS 연산이라 GPU/외부 API 호출이 필요 없다. 임베딩이 없는 상품(계산 전 신규
 * 등록분)은 shared/recommend.ts의 스타일 태그 휴리스틱으로 폴백한다.
 */
similarRoute.get('/:itemId', async (c) => {
  const itemId = c.req.param('itemId');
  const n = Number(c.req.query('n') ?? 5);

  const base = CATALOG.find((item) => item.id === itemId);
  if (!base) return c.json({ error: 'unknown item id' }, 404);

  const embeddings = await loadEmbeddings();
  const baseVec = embeddings[itemId];

  const candidates = CATALOG.filter((item) => item.category === base.category && item.id !== itemId);

  if (!baseVec) {
    return c.json(findSimilarHeuristic(base, CATALOG, n));
  }

  const ranked = candidates
    .map((item) => ({
      item,
      score: embeddings[item.id] ? cosineSimilarity(baseVec, embeddings[item.id]) : -1,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((entry) => entry.item);

  return c.json(ranked);
});
