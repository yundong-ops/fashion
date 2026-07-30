import type { CatalogItem } from '../../shared/types';

export interface TryOnParams {
  person: Blob;
  topGarment: Blob;
  bottomGarment: Blob;
  topDescription: string;
  bottomDescription: string;
}

export async function requestTryOn(params: TryOnParams): Promise<Blob> {
  const form = new FormData();
  form.set('person', params.person, 'person.webp');
  form.set('topGarment', params.topGarment, 'top.png');
  form.set('bottomGarment', params.bottomGarment, 'bottom.png');
  form.set('topDescription', params.topDescription);
  form.set('bottomDescription', params.bottomDescription);

  let res: Response;
  try {
    res = await fetch('/api/tryon', { method: 'POST', body: form });
  } catch {
    // fetch 자체가 실패하면(TypeError: Failed to fetch) 서버에 닿지도 못한 상태다 —
    // 브라우저 기본 메시지는 원인을 전혀 알려주지 않아 직접 안내한다.
    throw new Error(
      '서버에 연결할 수 없어요. 서버가 실행 중인지 확인해주세요 (npm run dev).',
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      detail
        ? `이미지 생성에 실패했어요: ${detail.slice(0, 200)}`
        : '이미지 생성에 실패했어요. 무료 AI 서버가 혼잡할 수 있으니 잠시 후 다시 시도해주세요.',
    );
  }
  return res.blob();
}

export async function fetchSimilar(itemId: string, n = 5): Promise<CatalogItem[]> {
  const res = await fetch(`/api/similar/${itemId}?n=${n}`);
  if (!res.ok) throw new Error('유사 상품을 불러오지 못했습니다');
  return res.json();
}
