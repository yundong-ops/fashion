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

  const res = await fetch('/api/tryon', { method: 'POST', body: form });
  if (!res.ok) throw new Error('이미지 생성에 실패했습니다');
  return res.blob();
}

export async function fetchSimilar(itemId: string, n = 5): Promise<CatalogItem[]> {
  const res = await fetch(`/api/similar/${itemId}?n=${n}`);
  if (!res.ok) throw new Error('유사 상품을 불러오지 못했습니다');
  return res.json();
}
