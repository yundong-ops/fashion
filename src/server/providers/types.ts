export interface TryOnInput {
  /** 합성 대상 인물 사진 (첫 패스: 원본 전신사진, 두번째 패스: 상의 합성 결과) */
  person: Blob;
  garment: Blob;
  garmentDescription: string;
  category: 'top' | 'bottom';
}

export interface TryOnResult {
  image: Buffer;
  mimeType: string;
  providerId: string;
  latencyMs: number;
}

export interface TryOnProvider {
  readonly id: string;
  generate(input: TryOnInput): Promise<TryOnResult>;
}
