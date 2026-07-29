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

export type BodyType = '스트레이트' | '웨이브' | '내추럴';
export type ShoulderHip = 'shoulder-wider' | 'balanced' | 'hip-wider';
export type TorsoLeg = 'long-torso' | 'balanced' | 'long-legs';
export type FaceShape = '둥근형' | '계란형' | '각진형' | '긴형' | '역삼각형';
export type PersonalColor = '웜톤' | '쿨톤' | '중성톤';
export type BmiClass = '저체중' | '표준' | '과체중' | '비만';

/** 비전 모델(Gemini)이 사진에서 산출하는 관찰 속성. cm 추정은 절대 시키지 않는다. */
export interface VisionTraits {
  bodyType: BodyType;
  shoulderVsHip: ShoulderHip;
  torsoToLegRatio: TorsoLeg;
  personalColor: PersonalColor;
  faceShape: FaceShape;
  shoulderSlope: 'straight' | 'sloped';
  neckLength: 'short' | 'average' | 'long';
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
  traits: VisionTraits;
  /** 비전 분석 실패 시 true — BMI 기반 폴백만 사용됨 */
  degraded: boolean;
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

export interface TryOnRequest {
  personPhoto: string; // data URL, 클라이언트에서만 사용 — 서버로는 Blob으로 전송
  facePhoto: string;
  topId: string;
  bottomId: string;
}

export interface TryOnResponse {
  imageDataUrl: string;
  providerId: string;
  latencyMs: number;
}
