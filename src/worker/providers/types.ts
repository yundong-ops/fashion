export interface TryOnInput {
  person: Blob;
  face: Blob;
  top: Blob;
  bottom: Blob;
  topDescription: string;
  bottomDescription: string;
}

export interface TryOnResult {
  image: Uint8Array;
  mimeType: string;
  providerId: string;
  latencyMs: number;
  costUnits?: number;
}

export interface TryOnProvider {
  readonly id: string;
  readonly maxInputImages: number;
  readonly maxInputDimension: number;
  generate(input: TryOnInput, env: Env): Promise<TryOnResult>;
}
