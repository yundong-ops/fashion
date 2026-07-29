// 카탈로그

export type Category = 'top' | 'bottom';
export type Fit = 'slim' | 'regular' | 'relaxed' | 'oversized';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type ColorTone = 'warm' | 'cool' | 'neutral';
export type StyleTag =
  | 'minimal'
  | 'casual'
  | 'street'
  | 'formal'
  | 'sporty'
  | 'amekaji'
  | 'classic'
  | 'workwear';

/** 한국 사이즈표 관례에 따른 단면(half-width) 치수, cm 단위. */
export interface SizeSpec {
  총장: number;
  어깨너비?: number;
  가슴단면?: number;
  소매길이?: number;
  허리단면?: number;
  엉덩이단면?: number;
  밑위?: number;
  허벅지단면?: number;
  밑단단면?: number;
}

export type SizeLabel = 'S' | 'M' | 'L' | 'XL';
export type SizeChart = Partial<Record<SizeLabel, SizeSpec>>;

export interface CatalogItem {
  id: string;
  category: Category;
  subcategory: string;
  brand: string;
  name: string;
  price: number;
  colorName: string;
  colorFamily: string;
  colorTone: ColorTone;
  fit: Fit;
  styleTags: StyleTag[];
  season: Season[];
  sizeChart: SizeChart;
  imagePath: string;
  detail: string;
  material: string;
}

// 사용자 프로필

export type ShoulderHip = 'shoulder-wider' | 'balanced' | 'hip-wider';
export type TorsoLeg = 'long-torso' | 'balanced' | 'long-legs';
export type BmiClass = '저체중' | '표준' | '과체중' | '비만';

/**
 * 브라우저에서 TensorFlow.js MoveNet으로 뽑아낸 체형 근사치.
 * 의료용 정확한 수치가 아니라 "의류 사이즈 추천에 참고할 근사치"이며,
 * 카메라 각도·자세에 따라 오차가 클 수 있다.
 */
export interface PoseTraits {
  shoulderVsHip: ShoulderHip;
  torsoToLegRatio: TorsoLeg;
  /** MoveNet 키포인트 평균 confidence (0~1). 낮으면 폴백 취급. */
  confidence: number;
}

/** 키/몸무게에서 산술로 도출하는 체촌 추정치 (사이즈코리아 근사). */
export interface BodyMetrics {
  heightCm: number;
  weightKg: number;
  bmi: number;
  bmiClass: BmiClass;
  est어깨너비: number;
  est가슴둘레: number;
  est허리둘레: number;
  est엉덩이둘레: number;
  est허벅지둘레: number;
  estInseam: number;
}

export interface UserProfile {
  metrics: BodyMetrics;
  /** MoveNet 포즈 인식 실패 시 null — BMI 기반 폴백만 사용됨 */
  pose: PoseTraits | null;
  createdAt: number;
}

// 추천 / 사이즈 핏

export interface SizeFitResult {
  best: SizeLabel | null;
  penalty: number;
  warnings: string[];
}

export interface ScoredItem {
  item: CatalogItem;
  score: number;
  fit: SizeFitResult;
}

export interface Outfit {
  top: ScoredItem;
  bottom: ScoredItem;
}

// 피팅 파이프라인

export interface TryOnResponse {
  imageDataUrl: string;
  providerId: string;
  latencyMs: number;
}
