import type { UserProfile } from '../../shared/types';

export async function analyzeProfile(height: number, weight: number): Promise<UserProfile> {
  const form = new FormData();
  form.set('height', String(height));
  form.set('weight', String(weight));

  const res = await fetch('/api/analyze', { method: 'POST', body: form });
  if (!res.ok) throw new Error('분석 요청에 실패했습니다');
  return res.json();
}

export interface TryOnParams {
  person: Blob;
  face: Blob;
  top: Blob;
  bottom: Blob;
  topDescription: string;
  bottomDescription: string;
}

export async function requestTryOn(params: TryOnParams): Promise<Blob> {
  const form = new FormData();
  form.set('person', params.person, 'person.webp');
  form.set('face', params.face, 'face.webp');
  form.set('top', params.top, 'top.webp');
  form.set('bottom', params.bottom, 'bottom.webp');
  form.set('topDescription', params.topDescription);
  form.set('bottomDescription', params.bottomDescription);

  const res = await fetch('/api/tryon', { method: 'POST', body: form });
  if (!res.ok) throw new Error('이미지 생성에 실패했습니다');
  return res.blob();
}
