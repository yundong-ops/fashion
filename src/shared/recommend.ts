import { fitSize } from './sizing';
import type {
  BodyType,
  CatalogItem,
  Fit,
  Outfit,
  ScoredItem,
  ShoulderHip,
  TorsoLeg,
  UserProfile,
} from './types';

// ── 스타일 스코어링 ──────────────────────────────────────────────
// 모든 상수는 근사 휴리스틱이며 튜닝 대상이다.

const BODY_FIT_PRIORITY: Record<BodyType, Fit[]> = {
  스트레이트: ['regular', 'slim', 'relaxed', 'oversized'],
  웨이브: ['slim', 'regular', 'relaxed', 'oversized'],
  내추럴: ['relaxed', 'oversized', 'regular', 'slim'],
};

function fitBodyScore(item: CatalogItem, bodyType: BodyType): number {
  const priority = BODY_FIT_PRIORITY[bodyType];
  const rank = priority.indexOf(item.fit);
  if (rank === 0) return 30;
  if (rank === 1) return 18;
  return 6;
}

function shoulderHipScore(item: CatalogItem, shoulderVsHip: ShoulderHip): number {
  if (shoulderVsHip === 'balanced') return 10;
  if (shoulderVsHip === 'shoulder-wider') {
    if (item.category !== 'top') return 7;
    return item.fit === 'slim' || item.fit === 'regular' ? 10 : 3;
  }
  // hip-wider
  if (item.category === 'top') {
    return item.fit === 'slim' || item.fit === 'regular' ? 10 : 3;
  }
  const darkColors = new Set(['black', 'gray', 'charcoal', 'navy']);
  return darkColors.has(item.colorFamily) ? 10 : 6;
}

function torsoLegScore(item: CatalogItem, torsoToLegRatio: TorsoLeg): number {
  if (torsoToLegRatio === 'balanced') return 10;
  if (torsoToLegRatio === 'long-torso') {
    if (item.category === 'bottom') {
      const spec = item.sizeChart.M ?? Object.values(item.sizeChart)[0];
      return spec?.밑위 !== undefined && spec.밑위 >= 28 ? 10 : 6;
    }
    return 8;
  }
  // long-legs
  return item.category === 'top' ? 8 : 6;
}

function silhouetteScore(item: CatalogItem, profile: UserProfile): number {
  const shoulderHip = shoulderHipScore(item, profile.traits.shoulderVsHip);
  const torsoLeg = torsoLegScore(item, profile.traits.torsoToLegRatio);
  return shoulderHip + torsoLeg; // 최대 20
}

function personalColorScore(item: CatalogItem, profile: UserProfile): number {
  const tone = profile.traits.personalColor;
  if (tone === '중성톤') return 14;
  if (tone === '웜톤') {
    if (item.colorTone === 'warm') return 20;
    if (item.colorTone === 'neutral') return 12;
    return 4;
  }
  // 쿨톤
  if (item.colorTone === 'cool') return 20;
  if (item.colorTone === 'neutral') return 12;
  return 4;
}

function sizeAvailabilityScore(item: CatalogItem, profile: UserProfile): number {
  const fit = fitSize(item, profile.metrics);
  if (!fit.best) return 0;
  return Math.max(0, 15 - fit.penalty * 0.3);
}

const SEASON_ORDER = ['spring', 'summer', 'fall', 'winter'] as const;

function currentSeason(): (typeof SEASON_ORDER)[number] {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function seasonScore(item: CatalogItem): number {
  const now = currentSeason();
  if (item.season.includes(now)) return 10;
  const idx = SEASON_ORDER.indexOf(now);
  const prev = SEASON_ORDER[(idx + 3) % 4];
  const next = SEASON_ORDER[(idx + 1) % 4];
  if (item.season.includes(prev) || item.season.includes(next)) return 5;
  return 0;
}

export function scoreItem(item: CatalogItem, profile: UserProfile): number {
  return (
    fitBodyScore(item, profile.traits.bodyType) +
    silhouetteScore(item, profile) +
    personalColorScore(item, profile) +
    sizeAvailabilityScore(item, profile) +
    seasonScore(item) +
    5 // 스타일 일관성 — 착장 조합 단계(pickOutfit)에서 실제로 반영됨
  );
}

function styleTagOverlap(a: CatalogItem, b: CatalogItem): number {
  const setA = new Set(a.styleTags);
  const setB = new Set(b.styleTags);
  const intersection = [...setA].filter((tag) => setB.has(tag)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function pickOutfit(catalog: CatalogItem[], profile: UserProfile): Outfit | null {
  const tops = catalog
    .filter((item) => item.category === 'top')
    .map((item) => ({ item, score: scoreItem(item, profile) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const bottoms = catalog
    .filter((item) => item.category === 'bottom')
    .map((item) => ({ item, score: scoreItem(item, profile) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (tops.length === 0 || bottoms.length === 0) return null;

  let best: { top: (typeof tops)[number]; bottom: (typeof bottoms)[number]; combo: number } | null =
    null;

  for (const top of tops) {
    for (const bottom of bottoms) {
      const combo = top.score + bottom.score + 15 * styleTagOverlap(top.item, bottom.item);
      if (!best || combo > best.combo) {
        best = { top, bottom, combo };
      }
    }
  }

  if (!best) return null;

  const topScored: ScoredItem = {
    item: best.top.item,
    score: best.top.score,
    fit: fitSize(best.top.item, profile.metrics),
  };
  const bottomScored: ScoredItem = {
    item: best.bottom.item,
    score: best.bottom.score,
    fit: fitSize(best.bottom.item, profile.metrics),
  };

  return { top: topScored, bottom: bottomScored };
}

// ── 유사 상품 ────────────────────────────────────────────────────

const FIT_ORDER: Fit[] = ['slim', 'regular', 'relaxed', 'oversized'];
const NEUTRAL_COLORS = new Set(['black', 'gray', 'charcoal', 'white', 'beige', 'navy']);

function fitDistanceScore(a: Fit, b: Fit): number {
  const distance = Math.abs(FIT_ORDER.indexOf(a) - FIT_ORDER.indexOf(b));
  return 1 - distance / (FIT_ORDER.length - 1);
}

function colorProximity(a: string, b: string): number {
  if (a === b) return 1;
  if (NEUTRAL_COLORS.has(a) && NEUTRAL_COLORS.has(b)) return 0.7;
  return 0.3;
}

function similarity(base: CatalogItem, candidate: CatalogItem): number {
  const styleSim = styleTagOverlap(base, candidate);
  const subcategorySim = base.subcategory === candidate.subcategory ? 1 : 0;
  const fitSim = fitDistanceScore(base.fit, candidate.fit);
  const colorSim = colorProximity(base.colorFamily, candidate.colorFamily);
  const priceSim = 1 - Math.min(1, Math.abs(base.price - candidate.price) / 50000);

  return (
    0.4 * styleSim + 0.2 * subcategorySim + 0.15 * fitSim + 0.15 * colorSim + 0.1 * priceSim
  );
}

export function findSimilar(item: CatalogItem, catalog: CatalogItem[], n = 5): CatalogItem[] {
  return catalog
    .filter((candidate) => candidate.category === item.category && candidate.id !== item.id)
    .map((candidate) => ({ candidate, score: similarity(item, candidate) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((entry) => entry.candidate);
}
