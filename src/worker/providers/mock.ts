import type { TryOnInput, TryOnProvider, TryOnResult } from './types';

/**
 * 뉴런을 전혀 소모하지 않는 마일스톤1 전용 프로바이더.
 * 커밋된 플레이스홀더 이미지를 반환해 UX 전체를 검증할 수 있게 한다.
 */
export const mockProvider: TryOnProvider = {
  id: 'mock',
  maxInputImages: 4,
  maxInputDimension: 512,

  async generate(_input: TryOnInput, env: Env): Promise<TryOnResult> {
    const start = Date.now();
    // 실제 생성처럼 느껴지도록 약간의 지연을 흉내낸다.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 'localhost'를 쓰는 이유: Vite dev 서버가 임의의 호스트명을 가진
    // 내부 Request를 allowedHosts 위반으로 차단한다.
    const placeholder = await env.ASSETS.fetch(
      new Request('http://localhost/tryon-placeholder.svg'),
    );
    const image = new Uint8Array(await placeholder.arrayBuffer());

    return {
      image,
      mimeType: 'image/svg+xml',
      providerId: 'mock',
      latencyMs: Date.now() - start,
      costUnits: 0,
    };
  },
};
