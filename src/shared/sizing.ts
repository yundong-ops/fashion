import type {
  BodyMetrics,
  CatalogItem,
  Fit,
  SizeFitResult,
  SizeLabel,
  SizeSpec,
} from './types';

/** 핏별 여유분(ease), cm 단위. 사이즈코리아 근사치와 마찬가지로 튜닝 대상. */
const CHEST_EASE: Record<Fit, number> = {
  slim: 4,
  regular: 10,
  relaxed: 16,
  oversized: 24,
};
const WAIST_EASE: Record<Fit, number> = {
  slim: 2,
  regular: 4,
  relaxed: 7,
  oversized: 10,
};

const SIZE_ORDER: SizeLabel[] = ['S', 'M', 'L', 'XL'];

function deviation(actual: number | undefined, ideal: number, weight: number): number {
  if (actual === undefined) return 0;
  return weight * (actual - ideal) ** 2;
}

function scoreTop(spec: SizeSpec, metrics: BodyMetrics, ease: number): number {
  const idealShoulder = metrics.est어깨너비;
  const idealChest = metrics.est가슴둘레 / 2 + ease / 2;
  return (
    deviation(spec.어깨너비, idealShoulder, 1.5) + deviation(spec.가슴단면, idealChest, 1.0)
  );
}

function scoreBottom(spec: SizeSpec, metrics: BodyMetrics, ease: number): number {
  const idealWaist = metrics.est허리둘레 / 2 + ease / 2;
  const idealThigh = metrics.est허벅지둘레 / 2;
  return (
    deviation(spec.허리단면, idealWaist, 1.2) + deviation(spec.허벅지단면, idealThigh, 0.8)
  );
}

function warningsFor(item: CatalogItem, spec: SizeSpec, metrics: BodyMetrics): string[] {
  const warnings: string[] = [];

  if (item.category === 'top') {
    const idealShoulder = metrics.est어깨너비;
    if (spec.어깨너비 !== undefined) {
      if (spec.어깨너비 > idealShoulder + 2) warnings.push('어깨가 약간 큽니다');
      else if (spec.어깨너비 < idealShoulder - 1.5) warnings.push('어깨가 다소 낍니다');
    }
  } else {
    if (spec.허리단면 !== undefined && spec.허리단면 * 2 < metrics.est허리둘레) {
      warnings.push('허리가 타이트할 수 있어요');
    }
    if (
      spec.허벅지단면 !== undefined &&
      spec.허벅지단면 * 2 < metrics.est허벅지둘레 + 3
    ) {
      warnings.push('허벅지가 끼일 수 있어요');
    }
  }

  if (warnings.length === 0) warnings.push('전체적으로 잘 맞습니다');
  return warnings;
}

export function fitSize(item: CatalogItem, metrics: BodyMetrics): SizeFitResult {
  const ease = item.category === 'top' ? CHEST_EASE[item.fit] : WAIST_EASE[item.fit];

  let best: SizeLabel | null = null;
  let bestPenalty = Infinity;

  for (const label of SIZE_ORDER) {
    const spec = item.sizeChart[label];
    if (!spec) continue;
    const penalty =
      item.category === 'top'
        ? scoreTop(spec, metrics, ease)
        : scoreBottom(spec, metrics, ease);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      best = label;
    }
  }

  if (!best) {
    return { best: null, penalty: Infinity, warnings: ['사이즈 정보가 없습니다'] };
  }

  const spec = item.sizeChart[best]!;
  return { best, penalty: bestPenalty, warnings: warningsFor(item, spec, metrics) };
}
